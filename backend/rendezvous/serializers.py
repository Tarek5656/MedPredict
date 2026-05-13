from datetime import time, timedelta
from django.utils import timezone
from rest_framework import serializers
from .models import RendezVous

class RendezVousSerializer(serializers.ModelSerializer):
    statut_effectif = serializers.CharField(read_only=True)
    end_datetime = serializers.DateTimeField(read_only=True)
    patient_nom = serializers.CharField(source="patient.nom", read_only=True)
    patient_prenom = serializers.CharField(source="patient.prenom", read_only=True)
    medecin_nom = serializers.CharField(source="medecin.last_name", read_only=True)
    medecin_prenom = serializers.CharField(source="medecin.first_name", read_only=True)

    class Meta:
        model = RendezVous
        fields = [
            "id",
            "patient",
            "patient_nom",
            "patient_prenom",
            "medecin",
            "medecin_nom",
            "medecin_prenom",
            "date_heure",
            "duree_minutes",
            "motif",
            "statut",
            "statut_effectif",
            "end_datetime",
            "created_at",
            "updated_at",
        ]

    def validate_duree_minutes(self, value):
        if value not in (15, 30):
            raise serializers.ValidationError("La durée doit être 15 ou 30 minutes.")
        return value

    def validate(self, attrs):
        instance = getattr(self, "instance", None)

        date_heure = attrs.get("date_heure", getattr(instance, "date_heure", None))
        duree = attrs.get("duree_minutes", getattr(instance, "duree_minutes", None))
        statut = attrs.get("statut", getattr(instance, "statut", "planifie"))
        patient = attrs.get("patient", getattr(instance, "patient", None))
        medecin = attrs.get("medecin", getattr(instance, "medecin", None))

        # ---- 1 Rendez-vous par patient par jour ET vérification consultation ----
        if patient and date_heure and statut != "annule":
            start_day = date_heure.replace(hour=0, minute=0, second=0, microsecond=0)
            end_day = start_day + timedelta(days=1)

            # Check existing RDV today
            qs_rdv = RendezVous.objects.filter(
                patient=patient,
                date_heure__gte=start_day,
                date_heure__lt=end_day
            ).exclude(statut="annule")
            
            if instance:
                qs_rdv = qs_rdv.exclude(pk=instance.pk)

            if qs_rdv.exists():
                raise serializers.ValidationError({
                    "patient": "Le patient a déjà un rendez-vous pour cette journée."
                })

            # Check if consultation already exists today
            from consultations.models import Consultation
            if Consultation.objects.filter(patient=patient, date__gte=start_day, date__lt=end_day).exists():
                raise serializers.ValidationError({
                    "patient": "Ce patient a déjà passé une consultation aujourd'hui."
                })

        if date_heure is None or duree is None:
            return attrs

        duree = int(duree)
        if duree <= 0:
            raise serializers.ValidationError({"duree_minutes": "La durée doit être > 0."})

        if statut == "annule":
            return attrs

        # Normaliser timezone si nécessaire
        if timezone.is_naive(date_heure):
            date_heure = timezone.make_aware(date_heure, timezone.get_current_timezone())

        # Pas dans le passé
        if date_heure < timezone.now():
            raise serializers.ValidationError({
                "date_heure": "Impossible de créer/modifier un rendez-vous dans le passé."
            })

        # Limitation de l'avance (90 jours)
        if date_heure > timezone.now() + timedelta(days=90):
            raise serializers.ValidationError({
                "date_heure": "Les réservations ne sont ouvertes que pour les 90 prochains jours."
            })

        start = date_heure
        end = start + timedelta(minutes=int(duree))

        # ---- Anti-chevauchement PATIENT ----
        if patient:
            qs_p = RendezVous.objects.exclude(statut="annule")
            if instance:
                qs_p = qs_p.exclude(pk=instance.pk)
            
            p_candidates = qs_p.filter(patient=patient, date_heure__lt=end)
            for prdv in p_candidates:
                prdv_end = prdv.date_heure + timedelta(minutes=int(prdv.duree_minutes))
                if prdv_end > start:
                    raise serializers.ValidationError({
                        "patient": "Ce patient a déjà un autre rendez-vous de prévu à cette heure-là."
                    })

        # ---- Créneaux autorisés + reste du temps ----
        morning_start = time(9, 0)
        morning_end   = time(13, 0)
        aft_start     = time(15, 0)
        aft_end       = time(18, 0)

        t_start = start.timetz().replace(tzinfo=None)

        # ---- Restriction jours ----
        # weekday(): 0=lundi ... 5=samedi ... 6=dimanche
        wd = start.weekday()

        if wd == 6:  # dimanche
            raise serializers.ValidationError({
                "date_heure": "Aucun rendez-vous le dimanche."
            })

        # samedi: matin uniquement
        if wd == 5:
            if not (morning_start <= t_start < morning_end):
                raise serializers.ValidationError({
                    "date_heure": "Le samedi, les rendez-vous sont possibles uniquement le matin (09:00-13:00)."
                })
        # lundi-vendredi: ok (matin ou après-midi, géré par la suite)

        # Déterminer fin de créneau selon l'heure de début
        if morning_start <= t_start < morning_end:
            slot_end_time = morning_end
        elif aft_start <= t_start < aft_end:
            slot_end_time = aft_end
        else:
            raise serializers.ValidationError({
                "date_heure": "Le rendez-vous doit commencer entre 09:00-13:00 ou 15:00-18:00."
            })

        slot_end = start.replace(
            hour=slot_end_time.hour,
            minute=slot_end_time.minute,
            second=0,
            microsecond=0,
        )

        if end > slot_end:
            remaining = int((slot_end - start).total_seconds() // 60)
            raise serializers.ValidationError({
                "duree_minutes": f"Durée trop longue: il ne reste que {remaining} minutes dans ce créneau."
            })

        # ---- Anti-chevauchement (par médecin, hors annule) ----
        qs = RendezVous.objects.exclude(statut="annule")
        if instance is not None:
            qs = qs.exclude(pk=instance.pk)

        if medecin:
            qs = qs.filter(medecin=medecin)

        candidates = qs.filter(date_heure__lt=end)

        for rdv in candidates:
            rdv_end = rdv.date_heure + timedelta(minutes=int(rdv.duree_minutes))
            if rdv_end > start:
                raise serializers.ValidationError({
                    "date_heure": "le medecin a un rendez-vous planifié pour ces heures"
                })

        return attrs