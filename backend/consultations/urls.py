from rest_framework.routers import DefaultRouter
from .views import ConsultationViewSet

router = DefaultRouter()
router.register(r"consultations", ConsultationViewSet, basename="consultations")

urlpatterns = router.urls