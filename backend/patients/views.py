from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django_filters.rest_framework import DjangoFilterBackend

from .models import Patient, DossierMedical
from .serializers import PatientSerializer, DossierMedicalSerializer, MyTokenObtainPairSerializer
from .permissions import IsSecretaire, IsMedecin
from .filters import PatientFilter
from rest_framework_simplejwt.views import TokenObtainPairView

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    return Response({
        "id": request.user.id,
        "username": request.user.username,
        "is_superuser": request.user.is_superuser,
        "groups": list(request.user.groups.values_list("name", flat=True)),
    })

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def medecins_list(request):
    User = get_user_model()
    qs = User.objects.filter(groups__name="MEDECIN").order_by("username").distinct()
    data = [
        {
            "id": u.id, 
            "username": u.username,
            "first_name": u.first_name,
            "last_name": u.last_name
        } for u in qs
    ]
    return Response(data)

@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_credentials(request):
    """
    Body JSON:
    {
      "username": "newname",              # optionnel
      "current_password": "oldpass",      # obligatoire
      "new_password": "newpass",          # optionnel
      "confirm_new_password": "newpass"   # optionnel
    }
    """
    User = get_user_model()
    user = request.user
    data = request.data or {}

    current_password = data.get("current_password") or ""
    if not user.check_password(current_password):
        return Response({"current_password": "Mot de passe actuel incorrect."}, status=status.HTTP_400_BAD_REQUEST)

    # username (optionnel)
    username = (data.get("username") or "").strip()
    if username and username != user.username:
        if User.objects.filter(username=username).exclude(pk=user.pk).exists():
            return Response({"username": "Ce username est déjà pris."}, status=status.HTTP_400_BAD_REQUEST)
        user.username = username

    # password (optionnel)
    new_password = data.get("new_password") or ""
    confirm = data.get("confirm_new_password") or ""
    if new_password or confirm:
        if new_password != confirm:
            return Response({"confirm_new_password": "Les mots de passe ne correspondent pas."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            validate_password(new_password, user)
        except Exception as e:
            # e est souvent une ValidationError avec liste de messages
            return Response({"new_password": [str(m) for m in getattr(e, "messages", [str(e)])]}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)

    user.save()
    return Response({"detail": "Mise à jour effectuée."}, status=status.HTTP_200_OK)


class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.all().order_by("nom", "prenom")
    serializer_class = PatientSerializer

    filter_backends = [DjangoFilterBackend]
    filterset_class = PatientFilter  # ✅

    @action(detail=False, methods=["get"], url_path="me")
    def me(self, request):
        try:
            patient = Patient.objects.get(user=request.user)
            serializer = self.get_serializer(patient)
            return Response(serializer.data)
        except Patient.DoesNotExist:
            return Response({"detail": "Aucun profil patient n'est associé à cet utilisateur."}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=["get"], url_path="me/dossier-medical")
    def me_dossier_medical(self, request):
        try:
            patient = Patient.objects.get(user=request.user)
            dm = patient.dossier_medical  # selon ton related_name
            return Response(DossierMedicalSerializer(dm).data)
        except Patient.DoesNotExist:
            return Response({"detail": "Aucun profil patient n'est associé à cet utilisateur."}, status=status.HTTP_404_NOT_FOUND)
        except getattr(Patient, 'dossier_medical').RelatedObjectDoesNotExist if hasattr(Patient, 'dossier_medical') else Exception:
            return Response({"detail": "Dossier médical non trouvé."}, status=status.HTTP_404_NOT_FOUND)

    def get_permissions(self):
        # Permissions spécifiques à l'action dossier-medical
        if getattr(self, "action", None) == "dossier_medical":
            if self.request.method == "PATCH":
                return [IsAuthenticated(), IsSecretaire() | IsMedecin()]
            return [IsAuthenticated()]

        # CRUD Patient => secrétaire (ou admin via IsSecretaire)
        if self.request.method in ["POST", "PUT", "PATCH", "DELETE"]:
            return [IsAuthenticated(), IsSecretaire()]

        return [IsAuthenticated()]

    def perform_create(self, serializer):
        patient = serializer.save()
        DossierMedical.objects.get_or_create(patient=patient)

    @action(detail=True, methods=["get", "patch"], url_path="dossier-medical")
    def dossier_medical(self, request, pk=None):
        patient = self.get_object()
        dossier, _ = DossierMedical.objects.get_or_create(patient=patient)

        if request.method == "GET":
            ser = DossierMedicalSerializer(dossier)
            return Response(ser.data)

        ser = DossierMedicalSerializer(dossier, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)