import re

def normalize_ma_phone(raw: str) -> str:
    """
    Normalise un numéro marocain vers E.164.
    Exemples:
      062087XXXX  -> +21262087XXXX
      0723456789  -> +212723456789
      +21262087XXX -> +21262087XXX (inchangé)
      21262087XXX  -> +21262087XXX
    Retourne "" si invalide.
    """
    if not raw:
        return ""

    s = raw.strip()
    s = s.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")

    # garder uniquement + et chiffres
    s = re.sub(r"[^\d+]", "", s)

    if s.startswith("+"):
        # déjà international, on valide vite
        if re.fullmatch(r"\+\d{8,15}", s):
            return s
        return ""

    # si commence par 212...
    if s.startswith("212"):
        s = "+" + s

    # formats locaux marocains 06/07
    if s.startswith("06") and len(s) == 10:
        return "+212" + s[1:]  # enlève le 0
    if s.startswith("07") and len(s) == 10:
        return "+212" + s[1:]

    # parfois on stocke sans 0: 6xxxxxxxx ou 7xxxxxxxx
    if (s.startswith("6") or s.startswith("7")) and len(s) == 9:
        return "+212" + s

    return ""