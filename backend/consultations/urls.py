from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import ConsultationViewSet
from .dashboard_views import DashboardStatsAPIView

router = DefaultRouter()
router.register(r"consultations", ConsultationViewSet, basename="consultations")

urlpatterns = [
    path("dashboard/stats/", DashboardStatsAPIView.as_view(), name="dashboard-stats"),
] + router.urls