# backend/rendezvous/tasks.py
from celery import shared_task
from datetime import timedelta
from django.utils import timezone
from django.db import transaction

from .models import RendezVous
from .sms import send_sms
from .phone_utils import normalize_ma_phone

from notifications.services import notify_group
from notifications.models import Notification

@shared_task(bind=True, max_retries=5, default_retry_delay=60)
def send_rdv_reminders_24h(self):
    now = timezone.now()

    # fenêtre ±10 minutes autour de H+24 (plus fiable)
    target = now + timedelta(hours=24)
    start = target - timedelta(minutes=10)
    end = target + timedelta(minutes=10)

    qs = (
        RendezVous.objects.select_related("patient")
        .filter(
            statut=RendezVous.Statut.PLANIFIE,
            rappel_24h_envoye=False,
            date_heure__gte=start,
            date_heure__lt=end,
        )
        .order_by("date_heure")
    )

    for rdv in qs:
        try:
            with transaction.atomic():
                locked = RendezVous.objects.select_for_update().get(pk=rdv.pk)
                if locked.rappel_24h_envoye:
                    continue
                if locked.statut != RendezVous.Statut.PLANIFIE:
                    continue

                tel_raw = (locked.patient.telephone or "").strip()
                tel = normalize_ma_phone(tel_raw)
                if not tel:
                    continue

                dt_local = timezone.localtime(locked.date_heure)
                msg = f"Rappel: rendez-vous le {dt_local.strftime('%d/%m/%Y à %H:%M')}."

                send_sms(tel, msg)

                locked.rappel_24h_envoye = True
                locked.save(update_fields=["rappel_24h_envoye"])

        except Exception as e:
            raise self.retry(exc=e)
        
@shared_task(bind=True, max_retries=5, default_retry_delay=60)
def send_rdv_notifications_10min(self):
    now = timezone.now()

    # fenêtre ±5 minutes autour de H+10 (ou élargis à ±10 si tu veux)
    target = now + timedelta(minutes=10)
    start = target - timedelta(minutes=5)
    end = target + timedelta(minutes=5)

    qs = (
        RendezVous.objects.select_related("patient")
        .filter(
            statut=RendezVous.Statut.PLANIFIE,
            notif_10min_envoyee=False,
            date_heure__gte=start,
            date_heure__lt=end,
        )
        .order_by("date_heure")
    )

    for rdv in qs:
        try:
            with transaction.atomic():
                locked = RendezVous.objects.select_for_update().get(pk=rdv.pk)
                if locked.notif_10min_envoyee:
                    continue
                if locked.statut != RendezVous.Statut.PLANIFIE:
                    continue

                dt_local = timezone.localtime(locked.date_heure)
                title = "Rendez-vous dans 15 minutes"
                body = f"Patient: {locked.patient.nom} {locked.patient.prenom} — {dt_local.strftime('%d/%m/%Y à %H:%M')}"
                url = f"/patients/{locked.patient_id}"  # adapte à ta route front

                notify_group(
                    "MEDECIN",
                    type=Notification.Type.RDV_REMINDER_10MIN,
                    title=title,
                    body=body,
                    url=url,
                )

                locked.notif_10min_envoyee = True
                locked.save(update_fields=["notif_10min_envoyee"])

        except Exception as e:
            raise self.retry(exc=e)