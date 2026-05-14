import os
import subprocess

from celery import shared_task
import requests
from twilio.rest import Client
import tempfile
try:
    from faster_whisper import WhisperModel
except ImportError:
    WhisperModel = None

import logging
from .gpt_utils import get_intent_from_flask
from .service import intent_action_text
from .models import ProcessedTwilioMessage

logger = logging.getLogger(__name__)

# Charge le modèle 1 seule fois par process worker
# (choisis "base" si machine faible, "small" si ça tient)
WHISPER_MODEL_NAME = os.getenv("WHISPER_MODEL", "base")
_whisper_model = None

def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        _whisper_model = WhisperModel(WHISPER_MODEL_NAME, device="cpu", compute_type="int8")
    return _whisper_model

def ogg_to_wav(input_path: str, output_path: str):
    # wav 16k mono (idéal ASR)
    cmd = ["ffmpeg", "-y", "-i", input_path, "-ar", "16000", "-ac", "1", output_path]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

@shared_task(bind=True, max_retries=2, default_retry_delay=5)
def process_whatsapp_audio(self, from_number: str, media_url: str, media_content_type: str = "", message_sid: str = ""):
    client = Client(os.getenv("TWILIO_ACCOUNT_SID"), os.getenv("TWILIO_AUTH_TOKEN"))

    try:
        # 1) Download media depuis Twilio (protégé)
        r = requests.get(
            media_url,
            auth=(os.getenv("TWILIO_ACCOUNT_SID"), os.getenv("TWILIO_AUTH_TOKEN")),
            timeout=(3, 60),
        )
        r.raise_for_status()

        with tempfile.TemporaryDirectory() as td:
            ogg_path = os.path.join(td, "in.ogg")
            wav_path = os.path.join(td, "out.wav")

            with open(ogg_path, "wb") as f:
                f.write(r.content)

            # 2) Convertir -> wav
            ogg_to_wav(ogg_path, wav_path)

            # 3) Transcrire
            model = get_whisper_model()
            segments, info = model.transcribe(wav_path, language=None)  # auto
            text = " ".join(seg.text for seg in segments).strip()

        if not text:
            reply = "Je n’ai pas bien compris l’audio. Peux-tu réécrire ta demande en texte (FR/EN/Darija) ?"
        else:
            # 4) Reuse ton pipeline IA (intent + réponse)
            # Option A: appeler ai-service directement avec text
            from .gpt_utils import get_intent_from_flask
            from .service import intent_action_text

            intent, confidence, message_used, handled, reply_text = get_intent_from_flask(text, timeout=(3, 60))

            if handled and reply_text:
                reply = reply_text
            else:
                reply = intent_action_text(from_number, (message_used or text).lower(), intent)

        # 5) Envoyer la réponse finale
        whatsapp_from = os.getenv("TWILIO_WHATSAPP_FROM")
        if not whatsapp_from.startswith("whatsapp:"):
            whatsapp_from = "whatsapp:" + whatsapp_from

        to = from_number
        if not to.startswith("whatsapp:"):
            to = "whatsapp:" + to

        client.messages.create(from_=whatsapp_from, to=to, body=reply)

    except Exception:
        logger.exception("process_whatsapp_audio failed")
        # fallback
        whatsapp_from = os.getenv("TWILIO_WHATSAPP_FROM")
        if not whatsapp_from.startswith("whatsapp:"):
            whatsapp_from = "whatsapp:" + whatsapp_from
        to = from_number if from_number.startswith("whatsapp:") else "whatsapp:" + from_number

        client.messages.create(
            from_=whatsapp_from,
            to=to,
            body="Désolé, je n’arrive pas à traiter ta note vocale pour le moment. Écris-moi en texte (FR/EN/Darija).",
        )
        raise

@shared_task(bind=True, max_retries=2, default_retry_delay=5)
def process_whatsapp_message(self, from_number: str, body: str, message_sid: str = ""):
    # 1) Idempotence (Twilio peut retry)
    if message_sid:
        obj, created = ProcessedTwilioMessage.objects.get_or_create(message_sid=message_sid)
        if not created:
            return  # déjà traité

    client = Client(os.getenv("TWILIO_ACCOUNT_SID"), os.getenv("TWILIO_AUTH_TOKEN"))

    try:
        intent, confidence, message_used, handled, reply_text = get_intent_from_flask(body, timeout=(3, 60))
        logging.info("Intent classified: %s (confidence: %f) message: %s handled: %s reply_text: %s", intent, confidence, message_used, handled, reply_text)

        body_to_use = (message_used or body).lower()
        if handled and reply_text:
            reply = reply_text
        else:
            reply = intent_action_text(from_number, body_to_use, intent)
    except Exception:
        logger.exception("process_whatsapp_message failed")
        reply = "Désolé, je rencontre un problème technique. Contacte le secrétariat si besoin."

    client.messages.create(
        from_=os.getenv("TWILIO_WHATSAPP_FROM"),
        to=from_number,
        body=reply,
    )