from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView

from .models import Notification
from .serializers import NotificationSerializer

class NotificationListView(ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by("-created_at")

class NotificationMarkReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        n = Notification.objects.filter(pk=pk, user=request.user).first()
        if not n:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        if not n.read:
            n.read = True
            n.read_at = timezone.now()
            n.save(update_fields=["read", "read_at"])

        return Response({"ok": True})