from django.contrib import admin
from .models import Patient, DossierMedical


class DossierMedicalInline(admin.StackedInline):
    model = DossierMedical
    can_delete = False
    extra = 0


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ("id", "nom", "prenom", "date_naissance", "telephone", "email", "sexe", "groupe_sanguin", "created_at")
    list_filter = ("sexe", "groupe_sanguin", "created_at")
    search_fields = ("nom", "prenom", "telephone", "email")
    ordering = ("nom", "prenom")
    date_hierarchy = "created_at"
    inlines = [DossierMedicalInline]