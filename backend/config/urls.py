from django.contrib import admin
from django.urls import path, include

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path("admin/", admin.site.urls),

    # ✅ JWT endpoints
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # ✅ tes routes API
    path("api/", include("patients.urls")),
    path("api/", include("rendezvous.urls")), 
    path("api/", include("consultations.urls")),
    path("api/", include("ai.urls")),
]