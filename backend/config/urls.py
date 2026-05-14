from django.contrib import admin
from django.urls import path, include

from rest_framework_simplejwt.views import (
    TokenRefreshView,
)
from patients.views import MyTokenObtainPairView

urlpatterns = [
    path("admin/", admin.site.urls),

    # ✅ JWT endpoints (Custom)
    path("api/token/", MyTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # ✅ tes routes API
    path("api/", include("patients.urls")),
    path("api/", include("rendezvous.urls")), 
    path("api/", include("consultations.urls")),
    path("api/", include("ai.urls")),
    path("api/", include("notifications.urls")),
    path("api/", include("chatbot.urls")),
    path("api/messaging/", include("messaging.urls")),
]