from django.contrib import admin
from .models import RendezVous

@admin.register(RendezVous)
class RendezVousAdmin(admin.ModelAdmin):
    list_display = ("id", "patient", "date_heure", "statut", "motif")
    list_filter = ("statut", "date_heure")
    search_fields = ("patient__nom", "patient__prenom", "motif")
    ordering = ("-date_heure",)