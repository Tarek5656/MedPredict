from django.conf import settings
from django.db import models
from patients.models import Patient
from django.utils import timezone
from datetime import timedelta

class RendezVous(models.Model):
    class Statut(models.TextChoices):
        EN_ATTENTE = "en_attente"
        PLANIFIE = "planifie"
        ANNULE = "annule"
        TERMINER = "termine"

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="rendezvous")
    medecin = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="rdvs_as_doctor")
    date_heure = models.DateTimeField()
    duree_minutes = models.PositiveIntegerField()
    motif = models.CharField(max_length=255, blank=True, default="")
    statut = models.CharField(max_length=20, choices=Statut.choices, default="planifie")

    rappel_24h_envoye = models.BooleanField(default=False)
    notif_10min_envoyee = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def end_datetime(self):
        return self.date_heure + timedelta(minutes=self.duree_minutes)

    @property
    def statut_effectif(self):
        """
        - si annulé => annulé (prioritaire)
        - sinon si fin passée => terminé
        - sinon => planifié
        """
        if self.statut == "annule":
            return "annule"
        if self.statut == "en_attente":
            return "en_attente"
        if timezone.now() >= self.end_datetime:
            return "termine"
        return "planifie"

    class Meta:
        ordering = ["-date_heure"]

    def __str__(self):
        return f"RDV {self.patient_id} - {self.date_heure}"