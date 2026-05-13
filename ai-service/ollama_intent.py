import json
import re
import requests
from datetime import datetime
import unicodedata

OLLAMA_URL = "http://ollama:11434"
OLLAMA_MODEL = "mistral:latest"
OLLAMA_TIMEOUT = 60
TZ_NAME = "Africa/Casablanca"

ALLOWED_INTENTS = {"creer", "annuler", "reporter", "verifier", "autre"}

# ----------------------------
# Text utils
# ----------------------------
def normalize_text(s: str) -> str:
    s = (s or "").strip().lower()
    if not s:
        return ""

    # enlever accents
    s = "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))

    # unifier séparateurs / ponctuation
    s = re.sub(r"[_\-–—/]", " ", s)
    s = re.sub(r"[^\w\s'?]", " ", s)  # garde ? et '
    s = re.sub(r"\s+", " ", s).strip()
    return s


AUDIO_HINT_RX = re.compile(r"\b(audio|voice|vocal|note vocale|voc|vn|voice note)\b", re.I)

QUESTION_RX = re.compile(
    r"(\?$)|\b(ou|où|quand|comment|pourquoi|combien|c est quoi|c'est quoi|est ce que|is it|how|where|when|what|why|wach|wach kayn|fin|ch7al)\b",
    re.I
)

# ----------------------------
# Clinic facts (texts)
# ----------------------------
HORAIRES_TEXT = "Horaires : lundi–vendredi 9h–13h et 15h–18h. Samedi 9h–13h."
PRIX_TEXT = "Tarif consultation : 300 DHS. 1 séance de contrôle gratuite."
HORAIRES_PRIX_TEXT = f"{HORAIRES_TEXT} {PRIX_TEXT}"

# ----------------------------
# Locked replies for "autre" (reply_id + lang)
# ----------------------------
ALLOWED_REPLY_IDS = {
    "bonjour",
    "aurevoir",
    "qui_es_tu",
    "aide",
    "merci",
    "horaires",
    "prix",
    "horaires_prix",
    "fallback",
}
ALLOWED_LANGS = {"fr", "en", "dz"}  # dz = darija latin

REPLY_TEXT = {
    "fr": {
        "bonjour": "Salut ! Comment puis-je vous aider ?",
        "aurevoir": "À bientôt !",
        "qui_es_tu": "Je suis l'assistant WhatsApp du cabinet médical. Je peux gérer tes rendez-vous (créer/annuler/reporter/vérifier) et répondre à des questions simples.",
        "aide": "Tu peux m'écrire : 'prendre rendez-vous', 'annuler', 'reporter', 'vérifier un RDV', ou demander les horaires / le prix.",
        "merci": "Avec plaisir !",
        "horaires": HORAIRES_TEXT,
        "prix": PRIX_TEXT,
        "horaires_prix": HORAIRES_PRIX_TEXT,
        "fallback": "Je peux répondre seulement à : bonjour, aide, qui es-tu, horaires, prix, merci, au revoir. Pour un RDV : 'prendre rendez-vous le JJ/MM à HHhMM'.",
    },
    "en": {
        "bonjour": "Hi! How can I help you?",
        "aurevoir": "See you soon!",
        "qui_es_tu": "I’m the clinic’s WhatsApp assistant. I can help manage appointments (create/cancel/reschedule/check) and answer simple questions.",
        "aide": "You can write: 'book an appointment', 'cancel', 'reschedule', 'check an appointment', or ask for opening hours / price.",
        "merci": "You're welcome!",
        "horaires": "Opening hours: Mon–Fri 9am–1pm and 3pm–6pm. Sat 9am–1pm.",
        "prix": "Consultation fee: 300 MAD. 1 follow-up control session is free.",
        "horaires_prix": "Opening hours: Mon–Fri 9am–1pm and 3pm–6pm. Sat 9am–1pm. Consultation fee: 300 MAD. 1 follow-up control session is free.",
        "fallback": "I can only answer: hello, help, who are you, opening hours, price, thanks, goodbye. For an appointment: 'book an appointment on DD/MM at HH:MM'.",
    },
    "dz": {
        "bonjour": "Salam! Kifach n9dr n3awnk?",
        "aurevoir": "Bslama!",
        "qui_es_tu": "Ana l-assistant WhatsApp dyal cabinet. N9dr n3awnk f RDV (t7جز/تلغي/تبدّل/تتأكد) w nجاوبk 3la chi so2alat bsita.",
        "aide": "T9dr tktb: 'prendre rendez-vous', 'annuler', 'reporter', 'vérifier RDV', wla تسول 3la horaires w prix.",
        "merci": "Bla mzyan!",
        "horaires": "Horaires: ltnin–jm3a 9h–13h w 15h–18h. Sbt 9h–13h.",
        "prix": "Prix dyal consultation: 300 DHS. W 1 séance contrôle gratuite.",
        "horaires_prix": "Horaires: ltnin–jm3a 9h–13h w 15h–18h. Sbt 9h–13h. Prix: 300 DHS w 1 séance contrôle gratuite.",
        "fallback": "N9dr nجاوب ghir: salam, aide, chkon nti/nta, horaires, prix, merci, bslama. Ila bghiti RDV ktb: 'prendre rendez-vous le JJ/MM à HHhMM'.",
    },
}

def _detect_lang_fallback(norm: str) -> str:
    if re.search(r"\b(hi|hello|thanks|price|opening|hours|who are you|help)\b", norm, re.I):
        return "en"
    if re.search(r"\b(salam|slm|bslama|chokran|ch7al|bch7al|kifach|wach|fin)\b", norm, re.I):
        return "dz"
    return "fr"

# ----------------------------
# RDV rules
# ----------------------------
_RDV_WORDS = r"(rdv|rendez\s?vous|rendezvous|appointment|appt|booking|noubat|nobat|nouba|noubti)"

_VERIFIER = r"(verif|verifier|verification|confirme|confirmer|confirmation|valider|check|confirm|verify|status|statut|kayn|kayen|wach kayn|wash kayn|imta)"
_ANNULER  = r"(annul|annuler|annulation|cancel|drop|supprim|supprimer|retir|retirer|n7yed|n7id|nhyed|mashi bghit)"
_REPORTER = r"(report|reporter|decal|decaler|deplac|deplacer|reprogram|reprogrammer|resched|reschedule|change|changer|modify|modifier|beddel|bdal|n9ell|n9al|nqell)"
_CREER    = r"(prendre|prends|reserver|reservation|book|schedule|planifier|fixer|set up|need|bghit|n7eb|nheb|bghit ndir)"

_INTENT_RULES = [
    ("verifier", re.compile(rf"\b({_VERIFIER})\b.*\b({_RDV_WORDS})\b|\b({_RDV_WORDS})\b.*\b({_VERIFIER})\b", re.I)),
    ("annuler",  re.compile(rf"\b({_ANNULER})\b.*\b({_RDV_WORDS})\b|\b({_RDV_WORDS})\b.*\b({_ANNULER})\b", re.I)),
    ("reporter", re.compile(rf"\b({_REPORTER})\b.*\b({_RDV_WORDS})\b|\b({_RDV_WORDS})\b.*\b({_REPORTER})\b", re.I)),
    ("creer",    re.compile(rf"\b({_CREER})\b.*\b({_RDV_WORDS})\b|\b({_RDV_WORDS})\b.*\b({_CREER})\b", re.I)),
]

def _intent_by_rules(norm: str):
    for intent, rx in _INTENT_RULES:
        if rx.search(norm):
            conf = 0.95 if intent != "creer" else 0.80
            return intent, conf
    return None, 0.0

# ----------------------------
# Quick replies (multilingue)
# ----------------------------
_HORAIRES_RX = re.compile(r"\b(horaires?|heures?|ouvert|ouverte|ouverture|fermeture|open|opening\s*hours|hours)\b", re.I)
_PRIX_RX = re.compile(r"\b(prix|tarifs?|tarif|combien|cout|co[uû]t|fee|price|ch7al|bch7al|taman)\b", re.I)

_QUICK_REPLIES = [
    (re.compile(r"\b(bonjour|bonsoir|salut|coucou|hello|hi|hey|bjr|slt|cc|salam|slm|assalam|aslam)\b", re.I), "bonjour"),
    (re.compile(r"\b(qui es tu|tu es qui|c est qui|cest qui|who are you|what are you|shkon nti|shkon nta|chkoun nta|chkoun nti)\b", re.I), "qui_es_tu"),
    (re.compile(r"\b(merci|thanks|thank you|thx|chokran|shukran|merci bcp|thanks a lot)\b", re.I), "merci"),
    (re.compile(r"\b(aide|help|menu|options|commandes|what can you do|how can you help|kifach t3awnini|kifach t3awnni)\b", re.I), "aide"),
    (re.compile(r"\b(aurevoir|au revoir|bye|goodbye|see you|a bientot|a plus|bslama|beslama|allah y3awn)\b", re.I), "aurevoir"),

    # horaires_prix
    (re.compile(r"(?=.*\b(horaires?|heures?|ouvert|open|hours)\b)(?=.*\b(prix|tarifs?|tarif|combien|cout|price|fee|ch7al|taman)\b).+", re.I), "horaires_prix"),

    # horaires only
    (_HORAIRES_RX, "horaires"),

    # prix only
    (_PRIX_RX, "prix"),
]

def _quick_reply(norm: str):
    lang = _detect_lang_fallback(norm)  # fr/en/dz
    for rx, reply_id in _QUICK_REPLIES:
        if rx.search(norm):
            if reply_id not in ALLOWED_REPLY_IDS:
                reply_id = "fallback"
            return REPLY_TEXT[lang][reply_id]
    return None

# ----------------------------
# JSON extraction from Ollama
# ----------------------------
def _extract_json(text: str) -> dict:
    text = (text or "").strip()
    text = text.replace("```json", "").replace("```", "").strip()
    m = re.search(r"\{.*\}", text, flags=re.S)
    if not m:
        raise ValueError(f"No JSON found in Ollama response: {text[:400]}")
    return json.loads(m.group(0))

# ----------------------------
# Ollama - classifier
# ----------------------------
def classify_only_ollama(message: str) -> dict:
    raw = (message or "").strip()
    now_iso = datetime.now().isoformat(timespec="seconds")

    prompt = f"""
Classify the user message for a medical clinic WhatsApp bot.

Allowed intents: creer, annuler, reporter, verifier, autre.

Return ONLY valid JSON (no extra text):
{{
  "intent": "creer|annuler|reporter|verifier|autre",
  "confidence": 0.0,
  "normalized_message": ""
}}

Context: date={now_iso} tz={TZ_NAME}
Message: {raw!r}
""".strip()

    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0, "num_predict": 80},
    }

    r = requests.post(f"{OLLAMA_URL}/api/generate", json=payload, timeout=(3, OLLAMA_TIMEOUT))
    r.raise_for_status()

    data = _extract_json(r.json().get("response", ""))

    intent = (data.get("intent") or "autre").strip().lower()
    if intent not in ALLOWED_INTENTS:
        intent = "autre"

    confidence = float(data.get("confidence", 0.0) or 0.0)
    confidence = max(0.0, min(1.0, confidence))

    normalized = (data.get("normalized_message") or raw).strip()

    return {"intent": intent, "confidence": confidence, "message": normalized}

# ----------------------------
# Ollama - locked replies for "autre"
# ----------------------------
def assistant_other_ollama(message: str) -> str:
    raw = (message or "").strip()
    norm = normalize_text(raw)
    now_iso = datetime.now().isoformat(timespec="seconds")

    prompt = f"""
You are a WhatsApp assistant for a medical clinic.
The user may write in French, English, or Darija (latin).

You MUST choose exactly ONE reply_id and ONE lang from the allowed lists and return ONLY JSON.
Do NOT output any extra text.

Allowed reply_id values:
- bonjour
- aurevoir
- qui_es_tu
- aide
- merci
- horaires
- prix
- horaires_prix
- fallback

Allowed lang values:
- fr
- en
- dz

SAFETY:
- Do NOT confirm/cancel/reschedule any appointment.
- Do NOT invent appointment dates/times.
- If user asks about appointments, choose reply_id="fallback".

Return ONLY valid JSON exactly like:
{{ "reply_id": "<one_of_allowed_values>", "lang": "fr|en|dz" }}

Decision rules:
- greetings -> bonjour
- thanks -> merci
- goodbye -> aurevoir
- who are you -> qui_es_tu
- help/menu/options -> aide
- opening hours -> horaires
- price/tarif/cost -> prix
- asks both hours and price -> horaires_prix
- anything else -> fallback

Context: date={now_iso} tz={TZ_NAME}
User message: {raw!r}
""".strip()

    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0, "num_predict": 60},
    }

    r = requests.post(f"{OLLAMA_URL}/api/generate", json=payload, timeout=(3, OLLAMA_TIMEOUT))
    r.raise_for_status()

    data = _extract_json(r.json().get("response", ""))

    reply_id = (data.get("reply_id") or "fallback").strip()
    lang = (data.get("lang") or "").strip().lower()

    if reply_id not in ALLOWED_REPLY_IDS:
        reply_id = "fallback"

    if lang not in ALLOWED_LANGS:
        lang = _detect_lang_fallback(norm)

    return REPLY_TEXT[lang][reply_id]

# ----------------------------
# Main entry
# ----------------------------
def classify_or_reply(message: str) -> dict:
    raw = (message or "").strip()
    norm = normalize_text(raw)

    # 0) vide
    if not norm:
        return {
            "intent": "autre",
            "confidence": 0.99,
            "message": raw,
            "handled": True,
            "reply_text": "Je n’ai pas reçu de texte. Peux-tu écrire ta demande en texte (FR/EN/Darija) ?",
        }

    # 1) rules RDV (priorité)
    intent, conf = _intent_by_rules(norm)
    if intent:
        return {"intent": intent, "confidence": conf, "message": raw, "handled": False, "reply_text": ""}

    # 2) quick replies (priorité)
    qr = _quick_reply(norm)
    if qr:
        return {"intent": "autre", "confidence": 0.99, "message": raw, "handled": True, "reply_text": qr}

    # 3) Ollama classifier
    c = classify_only_ollama(raw)
    intent = c["intent"]
    confidence = c["confidence"]
    msg_norm = c["message"]

    # 4) si RDV => jamais de reply_text
    if intent in {"creer", "annuler", "reporter", "verifier"}:
        return {"intent": intent, "confidence": confidence, "message": msg_norm, "handled": False, "reply_text": ""}

    # 5) locked assistant for "autre"
    try:
        reply = assistant_other_ollama(raw)
    except Exception:
        reply = REPLY_TEXT["fr"]["fallback"]

    if not reply:
        reply = REPLY_TEXT["fr"]["fallback"]

    return {"intent": "autre", "confidence": confidence, "message": msg_norm, "handled": True, "reply_text": reply}