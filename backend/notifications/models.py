from django.conf import settings
from django.db import models

class Notification(models.Model):
    class Type(models.TextChoices):
        RDV_REMINDER_10MIN = "RDV_REMINDER_10MIN"
        RDV_CREATED = "RDV_CREATED"
        RDV_CANCEL = "RDV_CANCEL"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    type = models.CharField(max_length=64, choices=Type.choices)
    title = models.CharField(max_length=255)
    body = models.TextField(blank=True, default="")
    url = models.CharField(max_length=500, blank=True, default="")

    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "read", "-created_at"]),
            models.Index(fields=["type", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.user} - {self.type} - {self.title}"