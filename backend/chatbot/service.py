from django.conf import settings
from rendezvous.serializers import RendezVousSerializer
from django.utils import timezone
from rendezvous.models import RendezVous
from patients.models import Patient
from .phone_utils import phone_ma_to_local
from django.db.models import Q
import re
import logging
from datetime import timedelta
from django.contrib.auth import get_user_model


logging.basicConfig(
    level=logging.INFO,  # ou DEBUG pour plus de détails
    format="%(asctime)s %(levelname)s %(message)s",
)

# -------- Utilitaire date (plus robuste, message flexible) --------
WEEKDAYS_FR = {
    "lundi": 0,
    "mardi": 1,
    "mercredi": 2,
    "jeudi": 3,
    "vendredi": 4,
    "samedi": 5,
    "dimanche": 6,
}

def _make_aware_local(year: int, month: int, day: int, hour: int, minute: int):
    tz = timezone.get_current_timezone()
    naive = timezone.datetime(year, month, day, hour, minute)
    return timezone.make_aware(naive, tz)

def _parse_time(text: str):
    """
    Supporte: "10h", "10h5", "10h05", "10:05", "10 : 05", "10h00"
    Retour: (hour, minute) ou None
    """
    text = (text or "").lower()

    m = re.search(
        r"\b(?P<h>\d{1,2})\s*(?:h|:)\s*(?P<m>\d{1,2})?\b",
        text
    )
    if not m:
        return None

    h = int(m.group("h"))
    m_raw = m.group("m")

    # minutes manquantes => 0 (ex: 16h)
    minute = int(m_raw) if m_raw is not None and m_raw != "" else 0

    # cas "10h5" => 10:05 (optionnel mais pratique)
    if 0 <= minute <= 9 and m_raw is not None and len(m_raw) == 1:
        minute = minute * 10 if minute != 0 else 0  # ou minute*1; perso je préfère 10h5 = 10:05:
        # si tu veux strictement 10h5 = 10:05:
        minute = int(f"{m_raw:0>2}")

    if 0 <= h <= 23 and 0 <= minute <= 59:
        return h, minute
    return None

def extract_datetime_from_text(text: str):
    text = (text or "").strip().lower()
    if not text:
        return None

    now = timezone.localtime(timezone.now())

    # 1) Parse heure (obligatoire pour créer un RDV)
    tm = _parse_time(text)
    if not tm:
        return None
    hour, minute = tm

    # 2) Cas relatifs: aujourd'hui / demain / apres-demain
    if re.search(r"\b(aujourd['’]hui|auj)\b", text):
        dt = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
        return dt

    if re.search(r"\b(demain)\b", text):
        base = now + timedelta(days=1)
        dt = base.replace(hour=hour, minute=minute, second=0, microsecond=0)
        return dt

    if re.search(r"\b(apres[\s-]?demain|après[\s-]?demain)\b", text):
        base = now + timedelta(days=2)
        dt = base.replace(hour=hour, minute=minute, second=0, microsecond=0)
        return dt

    # 3) Jour de semaine (prochain lundi, etc.)
    for name, weekday in WEEKDAYS_FR.items():
        if re.search(rf"\b{name}\b", text):
            days_ahead = (weekday - now.weekday()) % 7
            # si c'est aujourd'hui, on prend la semaine prochaine (pour éviter ambigu)
            if days_ahead == 0:
                days_ahead = 7
            base = now + timedelta(days=days_ahead)
            dt = base.replace(hour=hour, minute=minute, second=0, microsecond=0)
            return dt

    # 4) Dates explicites: 27/04(/2026) ou 27-04-26
    rx_date = re.compile(
        r"(?:\ble\b\s*)?"
        r"(?P<day>\d{1,2})[\/\-\.\s](?P<month>\d{1,2})"
        r"(?:[\/\-\.\s](?P<year>\d{2,4}))?",
        re.IGNORECASE,
    )
    m = rx_date.search(text)
    if not m:
        return None

    day = int(m.group("day"))
    month = int(m.group("month"))
    year_raw = m.group("year")

    year_was_provided = bool(year_raw)
    if year_raw:
        y = int(year_raw)
        if y < 100:
            y += 2000
        year = y
    else:
        year = now.year

    try:
        dt = _make_aware_local(year, month, day, hour, minute)
    except Exception:
        return None

    # Si pas d'année et date passée => année prochaine
    if not year_was_provided and dt < now:
        try:
            dt2 = _make_aware_local(now.year + 1, month, day, hour, minute)
            dt = dt2
        except Exception:
            pass

    return dt

User = get_user_model()

def get_default_medecin():
    return User.objects.filter(groups__name="MEDECIN").order_by("id").first()
    
def create_rdv_data(patient, dt, body_to_use):
    # Vérification durée (optionnelle)
    match_duree = re.search(r'\b(15|30)\s*(?:min|minutes)?\b', body_to_use)
    duree = int(match_duree.group(1)) if match_duree else 30
    medecin = get_default_medecin()
    return {
        "patient": patient.pk,
        "medecin": medecin.pk,
        "date_heure": dt,
        "duree_minutes": duree,
        "motif": "WhatsApp",
        "statut": "planifie"
    }

def intent_action_text(from_number: str, body_to_use: str, intent: str) -> str:
    # ---------- Identification patient ----------
    tel1 = from_number
    tel2 = phone_ma_to_local(from_number)
    try:
        patient = Patient.objects.get(Q(telephone=tel1) | Q(telephone=tel2))
    except Patient.DoesNotExist:
        return "Ton numéro WhatsApp n'est pas reconnu. Contacte le secrétariat pour lier ton compte patient."

    # ------------ LOGIQUE CAS 1. CREER ------------
    if intent == "creer":
        dt = extract_datetime_from_text(body_to_use)
        if not dt:
            return "Merci de préciser la date et l'heure du rendez-vous, ex : 'je veux un rendez-vous le 27/04 à 10h'."
              
        data = create_rdv_data(patient, dt, body_to_use)
        serializer = RendezVousSerializer(data=data)
        if serializer.is_valid():
            rdv = serializer.save()
            return f"Ton RDV est créé le {dt.strftime('%d/%m à %Hh%M')} pour {data['duree_minutes']} minutes."
        else:
            msg = "Impossible de créer le RDV :"
            for field, errors in serializer.errors.items():
                msg += f"\n- {field}: {', '.join(errors)}"
            return msg

    # ------------ CAS 2. ANNULER ---------------
    elif intent == "annuler":
        rdvs = RendezVous.objects.filter(
            patient=patient, date_heure__gte=timezone.now(),
            statut__in=["planifie"]
        )
        if rdvs.exists():
            for rdv in rdvs:
                rdv.statut = "annule"
                rdv.save()
            return "Votre RDV à venir est annulé. Pour plus de précisions, contacte le secrétariat."
        else:
            return "Aucun rendez-vous à annuler n’a été trouvé à ton nom."

    # ------------ CAS 3. REPORTER (annule puis crée) --------------
    elif intent == "reporter":
        # 1. Annule le prochain RDV à venir
        rdv = RendezVous.objects.filter(
            patient=patient, date_heure__gte=timezone.now(),
            statut__in=["planifie"]
        ).first()
        if not rdv:
            return "Aucun rendez-vous à déplacer n’a été trouvé. Contacte le secrétariat si besoin."
        rdv.statut = "annule"
        rdv.save()
        # 2. Crée le nouveau
        dt = extract_datetime_from_text(body_to_use)
        if not dt:
            return "Merci de préciser la nouvelle date et l'heure pour reporter ton rendez-vous, ex : 'je veux déplacer mon rdv le 27/04 à 10h'."
        data = create_rdv_data(patient, dt, body_to_use)
        serializer = RendezVousSerializer(data=data)
        if serializer.is_valid():
            new_rdv = serializer.save()
            return f"Ton RDV initial est annulé, et est déplacé au {dt.strftime('%d/%m à %Hh%M')} pour {data['duree_minutes']} minutes."
        else:
            msg = "RDV initial annulé mais la création du nouveau RDV a échoué :"
            for field, errors in serializer.errors.items():
                msg += f"\n- {field}: {', '.join(errors)}"
            return msg

    # ----------- CAS 4. VERIFIER -----------
    elif intent == "verifier":
        rdv = RendezVous.objects.filter(
            patient=patient, date_heure__gte=timezone.now(),
            statut__in=["planifie"]
        ).first()
        if rdv:
            return f"Ton prochain RDV est le {timezone.localtime(rdv.date_heure).strftime('%d/%m à %Hh%M')}."
        else:
            return "Aucun rendez-vous trouvé à ton nom."

    # ----------- Fallback IA --------------
    return "Ta demande n'est pas claire. Reformule ou contacte le secrétariat si besoin."