from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.filters import SearchFilter

from .models import Symptom, Disease
from .serializers import SymptomSerializer, DiseaseSerializer

class SymptomViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Symptom.objects.all().order_by("code")
    serializer_class = SymptomSerializer
    filter_backends = [SearchFilter]
    search_fields = ["code", "label"]

class DiseaseViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Disease.objects.all().order_by("name")
    serializer_class = DiseaseSerializer