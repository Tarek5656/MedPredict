from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone
from ai.models import Symptom


class Consultation(models.Model):
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        related_name="consultations",
    )
    medecin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="consultations",
    )
    rendezvous = models.ForeignKey(
        "rendezvous.RendezVous",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="consultations",
    )

    date = models.DateTimeField(default=timezone.now)

    symptoms = models.ManyToManyField(Symptom, blank=True, related_name="consultations")
    notes_cliniques = models.TextField(blank=True, default="")
    diagnostic = models.TextField(blank=True, default="")

    ai_predicted_disease = models.CharField(max_length=255, blank=True, default="")
    ai_confidence = models.FloatField(null=True, blank=True)
    ai_suggestions = models.JSONField(null=True, blank=True)  # [{disease, probability}, ...]
    ai_last_input = models.JSONField(null=True, blank=True)   # {symptoms:[...], top_k:...} ou juste liste
    ai_updated_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date"]
        verbose_name = "Consultation"
        verbose_name_plural = "Consultations"
        indexes = [
            models.Index(fields=["patient", "-date"]),
            models.Index(fields=["medecin", "-date"]),
        ]

    def __str__(self) -> str:
        # Exemple: "Consultation #12 — Patient 4 — Dr user — 2026-03-13 10:30"
        return f"Consultation #{self.pk} — Patient {self.patient_id} — Dr {self.medecin} — {self.date:%Y-%m-%d %H:%M}"


class Ordonnance(models.Model):
    consultation = models.OneToOneField(
        Consultation,
        on_delete=models.CASCADE,
        related_name="ordonnance",
    )

    notes = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Ordonnance"
        verbose_name_plural = "Ordonnances"

    def __str__(self) -> str:
        return f"Ordonnance #{self.pk} (Consultation #{self.consultation_id})"


class MedicamentPrescrit(models.Model):
    ordonnance = models.ForeignKey(
        Ordonnance,
        on_delete=models.CASCADE,
        related_name="lignes",
    )

    nom = models.CharField(max_length=200)
    dosage = models.CharField(max_length=200, blank=True, default="")
    frequence = models.CharField(max_length=200, blank=True, default="")
    duree_jours = models.PositiveIntegerField(null=True, blank=True)
    instructions = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["id"]
        verbose_name = "Médicament prescrit"
        verbose_name_plural = "Médicaments prescrits"

        # évite d’avoir 10 lignes identiques par erreur (optionnel)
        constraints = [
            models.UniqueConstraint(
                fields=["ordonnance", "nom", "dosage", "frequence", "duree_jours"],
                name="uniq_medicament_par_ordonnance",
            )
        ]

    def __str__(self) -> str:
        return f"{self.nom} — Ordonnance #{self.ordonnance_id}"