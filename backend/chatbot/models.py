from django.db import models

class ProcessedTwilioMessage(models.Model):
    message_sid = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
