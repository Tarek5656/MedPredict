"""
Entraîne un modèle de prédiction de maladie basé sur un dataset:
- 1 colonne cible (maladie)
- 2 colonnes démographiques (age, gender)
- N colonnes symptômes (0/1)

Sauvegarde:
- models/disease_model.pkl (pipeline)
- models/feature_columns.json (liste des features attendues)
"""

import os
import json
import joblib
import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.metrics import f1_score
from sklearn.ensemble import HistGradientBoostingClassifier

BASE_DIR = os.path.dirname(__file__)
DATA_PATH = os.path.join(BASE_DIR, "data", "dataset_prototype.csv")

MODELS_DIR = os.path.join(os.path.dirname(BASE_DIR), "models")
MODEL_PATH = os.path.join(MODELS_DIR, "disease_model.pkl")
FEATURES_PATH = os.path.join(MODELS_DIR, "feature_columns.json")

TARGET_COL = "diseases"

# ✅ Pour UI: Top-k utile
TOP_K_EVAL = 1


def top_k_accuracy(model, X, y_true, k=5):
    y_true = np.asarray(y_true)
    proba = model.predict_proba(X)
    classes = model.classes_
    topk_idx = np.argsort(proba, axis=1)[:, -k:]
    hits = [y_true[i] in classes[topk_idx[i]] for i in range(len(y_true))]
    return float(np.mean(hits))


def main():
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"Dataset introuvable: {DATA_PATH}")

    df = pd.read_csv(DATA_PATH)

    if TARGET_COL not in df.columns:
        raise ValueError(
            f"Colonne cible '{TARGET_COL}' introuvable. Colonnes disponibles: {list(df.columns)[:10]}..."
        )

    # y = maladies
    y = df[TARGET_COL].astype(str)

    # ✅ Regrouper classes rares en "other" (stabilise énormément)
    MIN_SAMPLES_PER_CLASS = 2
    OTHER_LABEL = "other"
    counts = y.value_counts()
    rare = counts[counts < MIN_SAMPLES_PER_CLASS].index
    y = y.where(~y.isin(rare), other=OTHER_LABEL)

    # Identifier les types de colonnes
    feature_cols = [c for c in df.columns if c != TARGET_COL]
    
    # Validation de la présence de l'age et gender
    if "age" not in feature_cols or "gender" not in feature_cols:
        print("ATTENTION: age ou gender introuvable dans le dataset. Assurez-vous d'avoir exécuté la génération de données synthétiques.")
        
    num_cols = ["age"] if "age" in feature_cols else []
    cat_cols = ["gender"] if "gender" in feature_cols else []
    symptom_cols = [c for c in feature_cols if c not in ["age", "gender"]]

    print("Dataset shape:", df.shape)
    print("Nb features:", len(feature_cols))
    print("Nb maladies uniques:", y.nunique())

    X = df[feature_cols]
    
    # ✅ Remplacer les valeurs manquantes
    if "age" in X.columns:
        X["age"] = X["age"].fillna(X["age"].median())
    if "gender" in X.columns:
        X["gender"] = X["gender"].fillna("M") # par défaut
        
    # Les symptômes manquants deviennent 0
    X[symptom_cols] = X[symptom_cols].fillna(0).astype(np.int8)

    # Split train/test
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Preprocessor pour ColumnTransformer
    transformers = []
    if num_cols:
        transformers.append(("num", StandardScaler(), num_cols))
    if cat_cols:
        transformers.append(("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), cat_cols))
    if symptom_cols:
        transformers.append(("symptoms", "passthrough", symptom_cols))
        
    preprocessor = ColumnTransformer(transformers=transformers)

    hgb_model = HistGradientBoostingClassifier(
        max_iter=100,
        max_depth=15,
        random_state=42,
        verbose=0
    )

    pipeline = Pipeline([
        ("preprocessor", preprocessor),
        ("clf", hgb_model),
    ])


    print("Entraînement avec HistGradientBoostingClassifier...")
    pipeline.fit(X_train, y_train)

    print("Évaluation...")
    # F1 sur tout le test set
    preds = pipeline.predict(X_test)
    f1_macro = f1_score(y_test, preds, average="macro")
    f1_weighted = f1_score(y_test, preds, average="weighted")

    # Top-k sur un échantillon
    EVAL_N = 100
    rng = np.random.RandomState(42)
    n = X_test.shape[0]
    take = min(EVAL_N, n)
    idx = rng.choice(n, size=take, replace=False)

    X_eval = X_test.iloc[idx]
    y_eval = np.asarray(y_test)[idx]
    top5 = top_k_accuracy(pipeline, X_eval, y_eval, k=TOP_K_EVAL)

    print("\nMetrics:")
    print("F1 macro:", round(float(f1_macro), 4))
    print("F1 weighted:", round(float(f1_weighted), 4))
    print(f"Top-{TOP_K_EVAL} accuracy:", round(float(top5), 4))

    os.makedirs(MODELS_DIR, exist_ok=True)
    joblib.dump(pipeline, MODEL_PATH)

    # On sauvegarde l'ordre exact des features pour le serveur Flask
    with open(FEATURES_PATH, "w", encoding="utf-8") as f:
        json.dump(feature_cols, f, ensure_ascii=False, indent=2)

    print(f"\nModèle sauvegardé: {MODEL_PATH}")
    print(f"Features sauvegardées: {FEATURES_PATH}")


if __name__ == "__main__":
    import warnings
    warnings.filterwarnings("ignore")
    main()