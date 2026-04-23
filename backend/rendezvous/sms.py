# backend/rendezvous/sms.py
from django.conf import settings
from twilio.rest import Client

def send_sms(to_number: str, message: str):
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN or not settings.TWILIO_FROM_NUMBER:
        raise RuntimeError("Twilio is not configured (missing env vars).")

    client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
    client.messages.create(
        body=message,
        from_=settings.TWILIO_FROM_NUMBER,
        to=to_number,
    )