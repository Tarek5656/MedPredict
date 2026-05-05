from flask import Flask, request, jsonify
import joblib
import os
import json
import pandas as pd
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(__file__)
MODEL_PATH = os.path.join(BASE_DIR, "models", "disease_model.pkl")
FEATURES_PATH = os.path.join(BASE_DIR, "models", "feature_columns.json")

model = joblib.load(MODEL_PATH)
with open(FEATURES_PATH, "r", encoding="utf-8") as f:
    FEATURE_COLS = json.load(f)

# Extract symptom features specifically (ignoring age and gender)
SYMPTOM_FEATURES = [c for c in FEATURE_COLS if c not in ["age", "gender"]]
FEATURE_SET = set(SYMPTOM_FEATURES)

print(f"Model loaded: {MODEL_PATH} | Total features={len(FEATURE_COLS)} | Symptoms={len(SYMPTOM_FEATURES)}")

import unicodedata

def normalize(text):
    if not text: return ""
    return "".join(c for c in unicodedata.normalize('NFD', str(text).lower())
                  if unicodedata.category(c) != 'Mn').strip()

def build_df(symptoms, age=None, gender=None):
    norm_map = {normalize(c): c for c in FEATURE_COLS if c not in ["age", "gender"]}
    row_data = {col: 0 for col in FEATURE_COLS if col not in ["age", "gender"]}
    unknown = []
    
    received_symptoms = [str(s).strip() for s in (symptoms or []) if str(s).strip()]
    
    for s_raw in received_symptoms:
        s_norm = normalize(s_raw)
        if s_norm in norm_map:
            original_key = norm_map[s_norm]
            row_data[original_key] = 1
        else:
            unknown.append(s_raw)

    if "age" in FEATURE_COLS:
        try:
            row_data["age"] = float(age) if age is not None else 45.0
        except ValueError:
            row_data["age"] = 45.0

    if "gender" in FEATURE_COLS:
        # On garde M/F car le OneHotEncoder a été entraîné avec ces chaînes
        g = str(gender).upper() if gender and str(gender).upper() in ["M", "F"] else "M"
        row_data["gender"] = g

    df = pd.DataFrame([row_data], columns=FEATURE_COLS)
    symptom_sum = sum([row_data[c] for c in FEATURE_COLS if c not in ["age", "gender"]])
    
    return df, unknown, symptom_sum

def top_k(df, k):
    proba = model.predict_proba(df)[0]
    classes = model.classes_
    pairs = sorted(zip(classes, proba), key=lambda x: x[1], reverse=True)
    pairs = pairs[:max(1, min(int(k), len(pairs), 20))]
    return [{"disease": c, "probability": round(float(p), 4)} for c, p in pairs]

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy", "model_loaded": model is not None, "features": len(FEATURE_COLS)})

@app.route("/api/predict", methods=["POST"])
def predict():
    if model is None:
        return jsonify({"error": "Model not loaded"}), 503

    data = request.json or {}
    symptoms = data.get("symptoms", [])
    age = data.get("age")
    gender = data.get("gender")
    top_k_n = int(data.get("top_k", 5))

    df, unknown, symptom_sum = build_df(symptoms, age, gender)
    
    # Logging pour le debug
    print(f"Prediction Request: age={age}, gender={gender}, symptoms_count={len(symptoms)}")
    print(f"Recognized symptoms: {symptom_sum}, Unknown: {unknown}")

    if symptom_sum == 0:
        return jsonify({
            "error": "Aucun symptôme reconnu.", 
            "unknown_symptoms": unknown,
            "received": symptoms
        }), 400

    suggestions = top_k(df, top_k_n)
    best = suggestions[0]

    resp_data = {
        "disease": best["disease"],
        "confidence": float(best["probability"]),
        "suggestions": suggestions,
        "unknown_symptoms": unknown,
    }
    
    # On désactive ensure_ascii pour que "Anémie" ne devienne pas "An\u00e9mie"
    return app.response_class(
        response=json.dumps(resp_data, ensure_ascii=False),
        status=200,
        mimetype='application/json'
    )

@app.route("/api/features", methods=["GET"])
def features():
    # Ne renvoie que la liste des symptômes (sans age ni gender) pour l'autocomplétion UI
    return jsonify({"features": SYMPTOM_FEATURES})


@app.route("/api/diseases", methods=["GET"])
def diseases():
    if model is None:
        return jsonify({"error": "Model not loaded"}), 503
    try:
        clf = model.named_steps['clf']
        return jsonify({"diseases": clf.classes_.tolist()})
    except Exception as e:

        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)