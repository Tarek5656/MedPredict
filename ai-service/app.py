from flask import Flask, request, jsonify
import joblib
import os
import json
import numpy as np
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(__file__)
MODEL_PATH = os.path.join(BASE_DIR, "models", "disease_model.pkl")
FEATURES_PATH = os.path.join(BASE_DIR, "models", "feature_columns.json")

model = joblib.load(MODEL_PATH)
with open(FEATURES_PATH, "r", encoding="utf-8") as f:
    FEATURE_COLS = json.load(f)

FEATURE_SET = set(FEATURE_COLS)
print(f"Model loaded: {MODEL_PATH} | features={len(FEATURE_COLS)}")

def build_vector(symptoms):
    vec = np.zeros((1, len(FEATURE_COLS)), dtype=np.int64)
    unknown = []
    sset = set([str(s).strip() for s in (symptoms or []) if str(s).strip()])
    for s in sset:
        if s not in FEATURE_SET:
            unknown.append(s)
    for i, col in enumerate(FEATURE_COLS):
        if col in sset:
            vec[0, i] = 1
    return vec, sorted(unknown)

def top_k(vec, k):
    proba = model.predict_proba(vec)[0]
    classes = model.classes_
    pairs = sorted(zip(classes, proba), key=lambda x: x[1], reverse=True)
    pairs = pairs[:max(1, min(int(k), len(pairs), 20))]
    return [{"disease": c, "probability": round(float(p), 4)} for c, p in pairs]

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy", "model_loaded": model is not None, "features": len(FEATURE_COLS)})

@app.route("/api/predict", methods=["POST"])
def predict():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Le corps de la requête doit être du JSON"}), 400

    symptoms = data.get("symptoms")
    if not isinstance(symptoms, list) or len(symptoms) == 0:
        return jsonify({"error": "Le champ 'symptoms' doit être une liste non vide"}), 400

    top_k_n = data.get("top_k", 5)

    vec, unknown = build_vector(symptoms)
    if int(vec.sum()) == 0:
        return jsonify({"error": "Aucun symptôme reconnu (vecteur vide).", "unknown_symptoms": unknown}), 400

    suggestions = top_k(vec, top_k_n)
    best = suggestions[0]

    return jsonify({
        "disease": best["disease"],
        "confidence": best["probability"],
        "suggestions": suggestions,
        "unknown_symptoms": unknown,
    })

@app.route("/api/features", methods=["GET"])
def features():
    # renvoie la liste des symptômes attendus par le modèle
    return jsonify({"features": FEATURE_COLS})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)