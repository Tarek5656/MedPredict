from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.conf import settings
import requests

from .models import Consultation, Ordonnance
from .serializers import ConsultationSerializer, OrdonnanceSerializer


class ConsultationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Consultation.objects.all().order_by("-date")
    serializer_class = ConsultationSerializer
    filterset_fields = ["patient", "medecin", "rendezvous"]

    def perform_create(self, serializer):
        serializer.save(medecin=self.request.user)

    # ✅ features globales (pour listbox / autocomplete)
    @action(detail=False, methods=["get"], url_path="ai-features")
    def ai_features(self, request):
        """
        Proxy Django -> Flask
        Réponse: { "features": [...] }
        """
        try:
            r = requests.get(f"{settings.AI_SERVICE_URL}/api/features", timeout=15)
            return Response(r.json(), status=r.status_code)
        except requests.RequestException as e:
            return Response(
                {"detail": f"AI service unreachable: {str(e)}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        
    # ✅ prédiction SANS consultation (pas de sauvegarde DB)
    @action(detail=False, methods=["post"], url_path="ai-predict")
    def ai_predict_no_pk(self, request):
        """
        Proxy Django -> Flask (sans consultation)

        Requête:
        { "symptoms": ["itching","skin_rash"], "top_k": 5 }

        Réponse: celle du microservice
        """
        symptoms = request.data.get("symptoms") or []
        top_k = int(request.data.get("top_k") or 5)
        age = request.data.get("age")
        gender = request.data.get("gender")

        if not isinstance(symptoms, list) or len(symptoms) == 0:
            return Response(
                {"detail": "symptoms must be a non-empty list"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            payload = {"symptoms": symptoms, "top_k": top_k}
            if age is not None: payload["age"] = age
            if gender is not None: payload["gender"] = gender
            
            r = requests.post(
                f"{settings.AI_SERVICE_URL}/api/predict",
                json=payload,
                timeout=15,
            )
            return Response(r.json(), status=r.status_code)

        except requests.RequestException as e:
            return Response(
                {"detail": f"AI service unreachable: {str(e)}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

    # ✅ prédiction liée à UNE consultation + sauvegarde du snapshot IA
    @action(detail=True, methods=["post"], url_path="ai-predict")
    def ai_predict(self, request, pk=None):
        """
        Proxy Django -> Flask + sauvegarde résultat dans la consultation

        Requête:
          { "symptoms": ["itching","skin_rash"], "top_k": 5 }

        Réponse: celle du microservice
        """
        consultation = self.get_object()

        symptoms = request.data.get("symptoms") or []
        top_k = int(request.data.get("top_k") or 5)
        
        # Si fournis par le front, sinon on tente de déduire du patient
        age = request.data.get("age")
        gender = request.data.get("gender")

        if not age and consultation.patient and consultation.patient.date_naissance:
            import datetime
            today = datetime.date.today()
            born = consultation.patient.date_naissance
            age = today.year - born.year - ((today.month, today.day) < (born.month, born.day))
            
        if not gender and consultation.patient and consultation.patient.sexe:
            gender = consultation.patient.sexe

        if not isinstance(symptoms, list) or len(symptoms) == 0:
            return Response(
                {"detail": "symptoms must be a non-empty list"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            payload = {"symptoms": symptoms, "top_k": top_k}
            if age is not None: payload["age"] = age
            if gender is not None: payload["gender"] = gender
            
            r = requests.post(
                f"{settings.AI_SERVICE_URL}/api/predict",
                json=payload,
                timeout=15,
            )
            data = r.json()

            # ✅ sauvegarde si succès
            if r.status_code == 200:
                consultation.ai_predicted_disease = data.get("disease") or ""
                consultation.ai_confidence = data.get("confidence")
                consultation.ai_suggestions = data.get("suggestions")
                consultation.ai_last_input = {"symptoms": symptoms, "top_k": top_k}
                consultation.ai_updated_at = timezone.now()
                consultation.save()

            return Response(data, status=r.status_code)

        except requests.RequestException as e:
            return Response(
                {"detail": f"AI service unreachable: {str(e)}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

    @action(detail=True, methods=["get","post", "delete"], url_path="ordonnance")
    def ordonnance(self, request, pk=None):
        consultation = self.get_object()
        ord_obj = getattr(consultation, "ordonnance", None)

        if request.method.lower() == "get":
            if ord_obj is None:
                return Response({"detail": "Aucune ordonnance."}, status=status.HTTP_404_NOT_FOUND)
            return Response(OrdonnanceSerializer(ord_obj).data, status=status.HTTP_200_OK)

        if request.method.lower() == "delete":
            if ord_obj is None:
                return Response({"detail": "Aucune ordonnance."}, status=status.HTTP_404_NOT_FOUND)
            ord_obj.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        # POST = upsert
        if ord_obj is None:
            ser = OrdonnanceSerializer(data=request.data)
            ser.is_valid(raise_exception=True)
            ord_obj = Ordonnance.objects.create(
                consultation=consultation,
                notes=ser.validated_data.get("notes", "")
            )
            for l in ser.validated_data.get("lignes", []):
                ord_obj.lignes.create(**l)
        else:
            ser = OrdonnanceSerializer(ord_obj, data=request.data, partial=True)
            ser.is_valid(raise_exception=True)
            ser.save()

        return Response(OrdonnanceSerializer(ord_obj).data, status=status.HTTP_200_OK)
    
    def get_queryset(self):
        qs = (
            Consultation.objects.all()
            .select_related("patient", "medecin", "rendezvous")
            .select_related("ordonnance")
            .prefetch_related("symptoms", "ordonnance__lignes")
            .order_by("-date")
        )

        user = self.request.user
        if not user.is_authenticated:
            return qs.none()

        if user.is_superuser:
            return qs

        groups = set(user.groups.values_list("name", flat=True))

        if "PATIENT" in groups:
            # nécessite Patient.user = OneToOneField(User)
            return qs.filter(patient__user=user)

        # Médecin / secrétaire: voient tout (ou filtrage par clinique/service si besoin)
        if "MEDECIN" in groups or "SECRETAIRE" in groups:
            return qs

        return qs.none()
    
    @action(detail=False, methods=["get"], url_path="me")
    def me(self, request):
        qs = self.get_queryset()
        page = self.paginate_queryset(qs)
        if page is not None:
            ser = self.get_serializer(page, many=True)
            return self.get_paginated_response(ser.data)
        ser = self.get_serializer(qs, many=True)
        return Response(ser.data)