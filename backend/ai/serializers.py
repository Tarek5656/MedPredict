from rest_framework import serializers
from .models import Symptom, Disease

class SymptomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Symptom
        fields = ["id", "code", "label"]

class DiseaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Disease
        fields = ["id", "name"]