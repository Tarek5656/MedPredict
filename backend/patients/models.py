from django.db import models

from django.conf import settings

class Patient(models.Model):
    
    class Sexe(models.TextChoices):
        MALE = "M", "Masculin"
        FEMALE = "F", "Féminin"

    class GroupeSaguin(models.TextChoices):
        A_POSITIF = "A+", "A positif"
        A_NEGATIF = "A-", "A négatif"
        B_POSITIF = "B+", "B positif"
        B_NEGATIF = "B-", "B négatif"
        AB_POSITIF = "AB+", "AB positif"
        AB_NEGATIF = "AB-", "AB négatif"
        O_POSITIF = "O+", "O positif"
        O_NEGATIF = "O-", "O négatif"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="patient_profile",
    )

    prenom = models.CharField(max_length=100)
    nom = models.CharField(max_length=100)

    date_naissance = models.DateField(null=True, blank=True)
    telephone = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    adresse = models.TextField(blank=True)

    sexe = models.CharField(max_length=1, choices=Sexe.choices, null=True)
    groupe_sanguin = models.CharField(max_length=3, choices=GroupeSaguin.choices, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["nom", "prenom"]

    def __str__(self):
        return f"{self.nom} {self.prenom}"


class DossierMedical(models.Model):
    patient = models.OneToOneField(Patient, on_delete=models.CASCADE, related_name="dossier_medical")

    antecedents_medicaux = models.TextField(blank=True)
    antecedents_familiaux = models.TextField(blank=True)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Dossier médical - {self.patient}"