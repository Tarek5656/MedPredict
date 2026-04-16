"""
Entraîne un modèle de prédiction de maladie basé sur un dataset:
- 1 colonne cible (maladie)
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
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score
from scipy.sparse import csr_matrix
from sklearn.linear_model import SGDClassifier

BASE_DIR = os.path.dirname(__file__)
DATA_PATH = os.path.join(BASE_DIR, "data", "dataset.csv")

MODELS_DIR = os.path.join(os.path.dirname(BASE_DIR), "models")
MODEL_PATH = os.path.join(MODELS_DIR, "disease_model.pkl")
FEATURES_PATH = os.path.join(MODELS_DIR, "feature_columns.json")

TARGET_COL = "diseases"

# ✅ Pour stabilité en prod: regrouper classes rares
MIN_SAMPLES_PER_CLASS = 5
OTHER_LABEL = "other"

# ✅ Pour UI: Top-k utile
TOP_K_EVAL = 5


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

    # X = colonnes symptômes (tout sauf TARGET_COL)
    feature_cols = [c for c in df.columns if c != TARGET_COL]

    # Convertir en int 0/1 propre (rapide et safe)
    X = df[feature_cols].fillna(0).astype(np.int8)
    X = csr_matrix(X.values)

    # ✅ Regrouper classes rares en "other" (stabilise énormément)
    counts = y.value_counts()
    rare = counts[counts < MIN_SAMPLES_PER_CLASS].index
    y2 = y.where(~y.isin(rare), other=OTHER_LABEL)

    print("Dataset shape:", df.shape)
    print("Nb features:", len(feature_cols))
    print("Nb classes avant:", y.nunique())
    print("Nb classes après:", y2.nunique())
    print(f"Classes regroupées (<{MIN_SAMPLES_PER_CLASS}):", len(rare))
    print(f"Taille '{OTHER_LABEL}':", int((y2 == OTHER_LABEL).sum()))

    # ✅ Split stratifié (possible car plus de classes à 1 sample)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y2, test_size=0.2, random_state=42, stratify=y2
    )

    pipeline = Pipeline([
        ("clf", SGDClassifier(
            loss="log_loss",
            penalty="l2",
            alpha=1e-4,              # à tuner (1e-5 à 1e-3)
            max_iter=60,             # "epochs" max
            tol=1e-3,
            early_stopping=True,     # stop si pas d'amélioration
            validation_fraction=0.1, # 10% du train pour val
            n_iter_no_change=5,      # patience
            class_weight="balanced",
            random_state=42,
            verbose=1,
        )),
    ])

    print("Entraînement...")
    pipeline.fit(X_train, y_train)

    # F1 sur tout le test set
    preds = pipeline.predict(X_test)
    f1_macro = f1_score(y_test, preds, average="macro")
    f1_weighted = f1_score(y_test, preds, average="weighted")

    # Top-k sur un échantillon (beaucoup plus rapide)
    EVAL_N = 10000
    rng = np.random.RandomState(42)
    n = X_test.shape[0]
    take = min(EVAL_N, n)
    idx = rng.choice(n, size=take, replace=False)

    X_eval = X_test[idx]
    y_eval = np.asarray(y_test)[idx]
    top5 = top_k_accuracy(pipeline, X_eval, y_eval, k=TOP_K_EVAL)

    print("\nMetrics:")
    print("F1 macro:", round(float(f1_macro), 4))
    print("F1 weighted:", round(float(f1_weighted), 4))
    print(f"Top-{TOP_K_EVAL} accuracy:", round(float(top5), 4))

    os.makedirs(MODELS_DIR, exist_ok=True)
    joblib.dump(pipeline, MODEL_PATH)

    with open(FEATURES_PATH, "w", encoding="utf-8") as f:
        json.dump(feature_cols, f, ensure_ascii=False, indent=2)

    print(f"\nModèle sauvegardé: {MODEL_PATH}")
    print(f"Features sauvegardées: {FEATURES_PATH}")

    # Test rapide: prendre une ligne
    sample = X_test[0:1]
    proba = pipeline.predict_proba(sample)[0]
    classes = pipeline.classes_
    top = sorted(zip(classes, proba), key=lambda x: x[1], reverse=True)[:5]
    print("\nTop-5 exemple:", [(d, round(float(p), 3)) for d, p in top])


if __name__ == "__main__":
    main()