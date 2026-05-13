# patients/serializers.py
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db import transaction
from rest_framework import serializers
from django.utils.text import slugify
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.exceptions import AuthenticationFailed

from .models import Patient, DossierMedical

User = get_user_model()

class DossierMedicalSerializer(serializers.ModelSerializer):
    class Meta:
        model = DossierMedical
        fields = ["id", "patient", "antecedents_medicaux", "antecedents_familiaux", "updated_at"]
        read_only_fields = ["id", "updated_at", "patient"]

class PatientSerializer(serializers.ModelSerializer):
    dossier_medical = DossierMedicalSerializer(read_only=True)

    class Meta:
        model = Patient
        fields = [
            "id", "prenom", "nom", "date_naissance", "telephone", "email", "adresse", "sexe", "groupe_sanguin",
            "created_at", "dossier_medical",
        ]
        read_only_fields = ["id", "created_at", "dossier_medical"]

    def _make_unique_username(self, nom, prenom):
        base = slugify(f"{nom}.{prenom}")  # ex: "el-yahyaoui.amine"
        username = base
        i = 1
        while User.objects.filter(username=username).exists():
            i += 1
            username = f"{base}{i}"         # ex: "el-yahyaoui.amine2"
        return username

    @transaction.atomic
    def create(self, validated_data):
        patient = super().create(validated_data)

        # créer user + groupe PATIENT
        username = self._make_unique_username(patient.nom, patient.prenom)

        # mot de passe initial (à choisir)
        # option 1: password = telephone (simple)
        password = patient.telephone or User.objects.make_random_password()

        user = User.objects.create_user(
            username=username,
            password=password,
            first_name=patient.prenom,
            last_name=patient.nom,
            email=patient.email or "",
        )

        group, _ = Group.objects.get_or_create(name="PATIENT")
        user.groups.add(group)

        # lier patient <-> user
        patient.user = user
        patient.save(update_fields=["user"])

        return patient

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        try:
            return super().validate(attrs)
        except Exception:
            raise AuthenticationFailed("identifiants incorrectes")