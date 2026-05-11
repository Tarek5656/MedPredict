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

from notifications.services import notify_group, notify_user
from notifications.models import Notification

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
            elif "MEDECIN" in groups and "SECRETAIRE" not in groups and "ADMIN" not in groups:
                # C'est un médecin pur : il ne voit que ses rendez-vous
                queryset = qs.filter(medecin=user)
            else:
                queryset = qs  # secretaire/admin

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
        
        # 1. Vérification du délai d'annulation (2 heures)
        if rdv.date_heure - timezone.now() < timedelta(hours=2):
            return Response({
                "detail": "Annulation impossible moins de 2 heures avant le rendez-vous. Veuillez contacter la clinique par téléphone."
            }, status=status.HTTP_400_BAD_REQUEST)

        # 2. Restriction Patient: Max 2 annulations par mois
        user = request.user
        groups = set(user.groups.values_list("name", flat=True))
        if "PATIENT" in groups and not user.is_superuser:
            now = timezone.now()
            month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            cancel_count = RendezVous.objects.filter(
                patient=rdv.patient,
                statut="annule",
                updated_at__gte=month_start
            ).count()
            
            if cancel_count >= 2:
                return Response({
                    "detail": "Limite d'annulation atteinte (2 par mois). Veuillez contacter la clinique pour toute demande particulière."
                }, status=status.HTTP_400_BAD_REQUEST)

        rdv.statut = "annule"
        rdv.save(update_fields=["statut", "updated_at"])
        
        user = self.request.user
        groups = set(user.groups.values_list("name", flat=True))

        if "PATIENT" in groups:
            title = "Rendez-vous annulé"
            body = f"{rdv.patient.nom} {rdv.patient.prenom} — {timezone.localtime(rdv.date_heure).strftime('%d/%m/%Y à %H:%M')}"
            url = f"/patients/{rdv.patient_id}"
            notify_group(
                "SECRETAIRE",
                type=Notification.Type.RDV_CANCEL,
                title=title,
                body=body,
                url=url,
            )

        return Response(self.get_serializer(rdv).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="refuser")
    def refuser(self, request, pk=None):
        rdv = self.get_object()
        if rdv.statut != "en_attente":
            return Response({"detail": "Seuls les rendez-vous en attente peuvent être refusés."}, status=status.HTTP_400_BAD_REQUEST)
        
        rdv.statut = "annule"
        rdv.save(update_fields=["statut", "updated_at"])

        if rdv.patient.user:
            dt_local = timezone.localtime(rdv.date_heure)
            notify_user(
                rdv.patient.user,
                type=Notification.Type.RDV_CANCEL,
                title="Rendez-vous refusé",
                body=f"Malheureusement, votre demande pour le {dt_local.strftime('%d/%m/%Y à %H:%M')} a été refusée.",
                url="/rendezvous"
            )
        
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

    def perform_create(self, serializer):
            # Détecter si l'auteur est un patient (groupe PATIENT)
            groups = set(self.request.user.groups.values_list("name", flat=True))
            created_by_patient = "PATIENT" in groups

            # Si c'est un patient, le statut est obligatoirement "en_attente"
            if created_by_patient:
                rdv = serializer.save(statut="en_attente")
            else:
                rdv = serializer.save()

            if created_by_patient:
                dt_local = timezone.localtime(rdv.date_heure)
                title = "Demande de rendez-vous"
                body = f"{rdv.patient.nom} {rdv.patient.prenom} sollicite un RDV pour le {dt_local.strftime('%d/%m/%Y à %H:%M')}"
                url = "/rendezvous"   # On renvoie vers la liste des RDV
                
                notify_group(
                    "SECRETAIRE",
                    type=Notification.Type.RDV_CREATED,
                    title=title,
                    body=body,
                    url=url,
                )

    @action(detail=True, methods=["post"], url_path="approuver")
    def approuver(self, request, pk=None):
        rdv = self.get_object()
        if rdv.statut != "en_attente":
            return Response({"detail": "Seuls les rendez-vous en attente peuvent être approuvés."}, status=status.HTTP_400_BAD_REQUEST)
        
        rdv.statut = "planifie"
        rdv.save(update_fields=["statut", "updated_at"])
        
        if rdv.patient.user:
            dt_local = timezone.localtime(rdv.date_heure)
            notify_user(
                rdv.patient.user,
                type=Notification.Type.RDV_CREATED,
                title="Rendez-vous accepté !",
                body=f"Votre rendez-vous pour le {dt_local.strftime('%d/%m/%Y à %H:%M')} a été validé par la clinique.",
                url="/rendezvous"
            )
        
        return Response(self.get_serializer(rdv).data, status=status.HTTP_200_OK)