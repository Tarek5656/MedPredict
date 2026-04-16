from rest_framework import viewsets
from rest_framework.permissions import BasePermission, IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from datetime import timedelta
from django.db.models import Q

from .models import RendezVous
from .serializers import RendezVousSerializer
from patients.permissions import IsPatient, IsSecretaire, CanCancelRdv

from django.utils.dateparse import parse_date
from django.utils import timezone
from datetime import datetime, time

class IsSecretaireOrPatient(BasePermission):
    def has_permission(self, request, view):
        return IsSecretaire().has_permission(request, view) or IsPatient().has_permission(request, view)

class RendezVousViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = RendezVousSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["patient", "statut"]

    @action(detail=False, methods=["get"], url_path="me")
    def me(self, request):
        qs = self.get_queryset()
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    def get_queryset(self):
        qs = RendezVous.objects.all().select_related("patient")     

        user = self.request.user
        if not user.is_authenticated:
            return qs.none()

        if user.is_superuser:
            queryset = qs
        else:
            groups = set(user.groups.values_list("name", flat=True))

            if "PATIENT" in groups:
                queryset = qs.filter(patient__user=user)
            else:
                queryset = qs  # secretaire/admin/medecin

        date_str = self.request.query_params.get("date")
        if date_str:
            d = parse_date(date_str)
            if d:
                tz = timezone.get_current_timezone()
                start = timezone.make_aware(datetime.combine(d, time.min), tz)
                end = start + timezone.timedelta(days=1)
                queryset = queryset.filter(date_heure__gte=start, date_heure__lt=end)

        if self.request.query_params.get("without_consultation") in ("1", "true", "True"):
            queryset = queryset.exclude(statut="annule")
            queryset = queryset.filter(consultations__isnull=True).distinct()

        if self.request.query_params.get("non_annule") in ("1", "true", "True"):
            queryset = queryset.exclude(statut="annule")

        q = self.request.query_params.get("q")
        if q:
            q = q.strip()
            parts = [p for p in q.split() if p]

            if len(parts) == 1:
                term = parts[0]
                queryset = queryset.filter(
                    Q(patient__nom__icontains=term) |
                    Q(patient__prenom__icontains=term)
                )
            else:
                a, b = parts[0], parts[1]
                queryset = queryset.filter(
                    (Q(patient__nom__icontains=a) & Q(patient__prenom__icontains=b)) |
                    (Q(patient__nom__icontains=b) & Q(patient__prenom__icontains=a))
                )

        return queryset

    @action(detail=True, methods=["post"], url_path="annuler")
    def annuler(self, request, pk=None):
        rdv = self.get_object()
        rdv.statut = "annule"
        rdv.save(update_fields=["statut", "updated_at"])
        return Response(self.get_serializer(rdv).data, status=status.HTTP_200_OK)

    def get_permissions(self):
        if self.action == "annuler":
            return [IsAuthenticated(), CanCancelRdv()]

        if self.request.method in ["POST", "PUT", "PATCH", "DELETE"]:
            return [IsAuthenticated(), IsSecretaireOrPatient()]

        return [IsAuthenticated()]
    
    def _mark_termine_if_needed(self):
        """
        Met à jour en DB les RDV planifiés dont la fin est passée.
        Appelé sur les endpoints GET (list/retrieve).
        """
        now = timezone.now()

        qs = RendezVous.objects.filter(statut="planifie")

        # Si tu veux exclure annule (déjà fait) et tenir compte de la durée
        updated = 0
        for rdv in qs.iterator():
            end = rdv.date_heure + timedelta(minutes=int(rdv.duree_minutes or 0))
            if end <= now:
                rdv.statut = "termine"
                rdv.save(update_fields=["statut", "updated_at"])
                updated += 1

        return updated
    
    def list(self, request, *args, **kwargs):
        self._mark_termine_if_needed()
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        self._mark_termine_if_needed()
        return super().retrieve(request, *args, **kwargs)