import requests
import os
import logging

logger = logging.getLogger(__name__)

FLASK_BASE_URL = os.getenv("AI_SERVICE_URL")
FLASK_WHATSAPP_ENDPOINT = FLASK_BASE_URL.rstrip("/") + "/api/whatsapp_chat"

def get_intent_from_flask(msg, flask_url=FLASK_WHATSAPP_ENDPOINT, timeout=(3, 20)):
    """
    Envoie un texte à l'API Flask et récupère:
      (intent, confidence, message, handled, reply_text)

    - handled: bool, indique si ai-service a déjà produit la réponse finale
    - reply_text: str, texte à envoyer directement à l'utilisateur si handled=True
    """
    try:
        r = requests.post(flask_url, json={"message": msg}, timeout=timeout)
        r.raise_for_status()
        data = r.json() or {}

        intent = (data.get("intent") or "autre").strip().lower()
        confidence = float(data.get("confidence", 0.0) or 0.0)
        message = data.get("message") or msg

        handled = bool(data.get("handled", False))
        reply_text = (data.get("reply_text") or "").strip()

        return intent, confidence, message, handled, reply_text

    except Exception as e:
        logger.exception("Erreur d'appel à l'API Flask (%s): %s", flask_url, e)
        # fallback: pas "handled", pas de reply_text
        return "autre", 0.0, msg, False, ""