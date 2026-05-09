import re

def phone_ma_to_local(raw: str) -> str:
    if not raw:
        return ""
    s = raw.strip()
    s = s.replace(" ", "").replace("-", "")
    s = re.sub(r"[^\d+]", "", s)

    # Si déjà au format local
    if s.startswith("06") and len(s) == 10:
        return s
    if s.startswith("07") and len(s) == 10:
        return s

    # Si international Maroc +2126xxxxxxx ou +2127xxxxxxx
    m = re.match(r'^\+212([67]\d{8})$', s)
    if m:
        return '0' + m.group(1)

    # Si sans "+" (2126xxxxxxx)
    m = re.match(r'^212([67]\d{8})$', s)
    if m:
        return '0' + m.group(1)

    # Si déjà 6xxxxxxxx ou 7xxxxxxxx (sans 0, sans +212) : on ajoute 0 devant
    m = re.match(r'^([67]\d{8})$', s)
    if m:
        return '0' + m.group(1)

    return ""