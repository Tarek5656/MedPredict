# backend/config/celery.py
import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("config")

# lit les settings CELERY_* depuis Django settings
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

# planification: toutes les minutes
app.conf.beat_schedule = {
    "rdv-reminders-24h-every-minute": {
        "task": "rendezvous.tasks.send_rdv_reminders_24h",
        "schedule": crontab(minute="*"),
    },
    "rdv-notifications-10min-every-minute": {
        "task": "rendezvous.tasks.send_rdv_notifications_10min",
        "schedule": crontab(minute="*"),
    }

}