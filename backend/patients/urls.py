from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PatientViewSet, me, medecins_list, update_credentials
from .admin_views import (
    admin_stats, admin_users_list, admin_update_user_status, 
    admin_recent_activity, admin_system_health, admin_create_user
)
router = DefaultRouter()
router.register(r"patients", PatientViewSet, basename="patients")

urlpatterns = [
    path("me/", me),              # ✅ http://localhost:8000/api/me/
    path("", include(router.urls)),
    path("medecins/", medecins_list),  # ✅
    path("me/update-credentials/", update_credentials),
    
    # ✅ Admin Routes
    path("admin/stats/", admin_stats),
    path("admin/users/", admin_users_list),
    path("admin/users/<int:user_id>/status/", admin_update_user_status),
    path("admin/recent-activity/", admin_recent_activity),
    path("admin/system-health/", admin_system_health),
    path("admin/users/create/", admin_create_user),
]