import django_filters
from .models import Patient

class PatientFilter(django_filters.FilterSet):
    # ID: exact (tu peux aussi faire "contains" mais ça n'a pas de sens pour un int)
    id = django_filters.NumberFilter(field_name="id")

    # ✅ LIKE "%...%" (insensible à la casse)
    telephone = django_filters.CharFilter(field_name="telephone", lookup_expr="icontains")
    email = django_filters.CharFilter(field_name="email", lookup_expr="icontains")
    nom = django_filters.CharFilter(field_name="nom", lookup_expr="icontains")
    prenom = django_filters.CharFilter(field_name="prenom", lookup_expr="icontains")

    class Meta:
        model = Patient
        fields = ["id", "telephone", "email", "nom", "prenom"]