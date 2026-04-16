from rest_framework import serializers
from .models import Consultation, Ordonnance, MedicamentPrescrit
from ai.serializers import SymptomSerializer
from ai.models import Symptom

class MedicamentPrescritSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicamentPrescrit
        fields = ["id", "nom", "dosage", "frequence", "duree_jours", "instructions"]

class OrdonnanceSerializer(serializers.ModelSerializer):
    lignes = MedicamentPrescritSerializer(many=True)

    class Meta:
        model = Ordonnance
        fields = ["id", "consultation", "notes", "lignes", "created_at", "updated_at"]
        read_only_fields = ["consultation", "created_at", "updated_at"]

    def create(self, validated_data):
        lignes = validated_data.pop("lignes", [])
        ordonnance = Ordonnance.objects.create(**validated_data)
        for l in lignes:
            MedicamentPrescrit.objects.create(ordonnance=ordonnance, **l)
        return ordonnance

    def update(self, instance, validated_data):
        lignes = validated_data.pop("lignes", None)
        instance.notes = validated_data.get("notes", instance.notes)
        instance.save()

        if lignes is not None:
            instance.lignes.all().delete()
            for l in lignes:
                MedicamentPrescrit.objects.create(ordonnance=instance, **l)
        return instance

class ConsultationSerializer(serializers.ModelSerializer):
    ordonnance = OrdonnanceSerializer(read_only=True)
    symptoms = SymptomSerializer(many=True, read_only=True)
    symptom_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        write_only=True,
        queryset=Symptom.objects.all(),
        source="symptoms",
        required=False,
    )
    symptom_codes = serializers.ListField(
        child=serializers.CharField(),
        write_only=True,
        required=False,
    )

    def validate(self, attrs):
        attrs = super().validate(attrs)

        # si symptom_ids est envoyé, il arrive déjà mappé vers "symptoms"
        sent_symptoms_via_ids = "symptoms" in attrs
        codes = attrs.pop("symptom_codes", None)

        if codes is not None and sent_symptoms_via_ids:
            raise serializers.ValidationError(
                {"symptom_codes": "Ne pas envoyer symptom_codes et symptom_ids en même temps."}
            )

        if codes is not None:
            cleaned = [str(c).strip() for c in codes if str(c).strip()]

            if not cleaned:
                attrs["symptoms"] = []
                return attrs

            qs = Symptom.objects.filter(code__in=cleaned)
            found = list(qs)

            found_codes = {s.code for s in found}
            missing = [c for c in cleaned if c not in found_codes]
            if missing:
                raise serializers.ValidationError(
                    {"symptom_codes": [f"Codes inconnus: {', '.join(missing)}"]}
                )

            # option: garder l'ordre comme l'utilisateur l'a envoyé
            by_code = {s.code: s for s in found}
            attrs["symptoms"] = [by_code[c] for c in cleaned if c in by_code]

        return attrs

    class Meta:
        model = Consultation
        fields = [
            "id", "patient", "medecin", "rendezvous",
            "date", "symptoms",
            "symptom_ids",
            "symptom_codes",
            "ai_predicted_disease",
            "ai_confidence",
            "ai_suggestions",
            "ai_last_input",
            "ai_updated_at", "notes_cliniques", "diagnostic",
            "ordonnance",
            "created_at", "updated_at",
        ]
        read_only_fields = ["medecin", "created_at", "updated_at"]