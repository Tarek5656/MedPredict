import time
from rest_framework.views import APIView
from django.http import HttpResponse
from twilio.twiml.messaging_response import MessagingResponse

from chatbot.service import extract_datetime_from_text
from django.utils import timezone
from .tasks import process_whatsapp_message, process_whatsapp_audio
import traceback
import logging

logging.basicConfig(
    level=logging.INFO,  # ou DEBUG pour plus de détails
    format="%(asctime)s %(levelname)s %(message)s",
)

class WhatsAppWebhookView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request, *args, **kwargs):
        resp = MessagingResponse()
        from_number = request.POST.get("From") or request.data.get("From", "")
        body = (request.POST.get("Body") or request.data.get("Body") or "").strip()
        message_sid = request.POST.get("MessageSid") or request.data.get("MessageSid", "")

        num_media = int(request.POST.get("NumMedia") or 0)
        message_type = (request.POST.get("MessageType") or "").lower()
        media_url0 = request.POST.get("MediaUrl0")
        media_type0 = (request.POST.get("MediaContentType0") or "").lower()

        logging.info("RAW body_to_use=%r", body)
        dt_raw = extract_datetime_from_text(body)
        logging.info("extract_datetime_from_text(body) => %r", dt_raw)
        logging.info("now_local => %r", timezone.localtime(timezone.now()))

        try:
            t0 = time.time()
            logging.info("START webhook from=%r body=%r", from_number, body)

            is_audio = (num_media > 0) and (
                message_type == "audio" or media_type0.startswith("audio/")
            )

            if is_audio and media_url0:
                resp.message("Je transcris ta note vocale…")
                process_whatsapp_audio.delay(
                    from_number=from_number,
                    media_url=media_url0,
                    media_content_type=media_type0,
                    message_sid=message_sid,
                )
                return HttpResponse(str(resp), content_type="application/xml")

            # ACK immédiat pour Twilio (garantie)
            resp.message("Je traite ta demande…")

            # Lancer la task Celery (Ollama/DB hors webhook)
            process_whatsapp_message.delay(from_number=from_number, body=body, message_sid=message_sid)

            logging.info("END webhook (ACK) total=%.2fs", time.time() - t0)
            return HttpResponse(str(resp), content_type="application/xml")

        except Exception as e:
            traceback.print_exc()
            resp.message("Erreur serveur. Réessaie dans quelques instants.")
            return HttpResponse(str(resp), content_type="application/xml")