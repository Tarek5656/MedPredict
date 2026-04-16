from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PatientViewSet, me, medecins_list, update_credentials

router = DefaultRouter()
router.register(r"patients", PatientViewSet, basename="patients")

urlpatterns = [
    path("me/", me),              # ✅ http://localhost:8000/api/me/
    path("", include(router.urls)),
    path("medecins/", medecins_list),  # ✅
    path("me/update-credentials/", update_credentials),

]