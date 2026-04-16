from rest_framework.routers import DefaultRouter
from .views import SymptomViewSet, DiseaseViewSet

router = DefaultRouter()
router.register(r"symptoms", SymptomViewSet, basename="symptoms")
router.register(r"diseases", DiseaseViewSet, basename="diseases")

urlpatterns = router.urls