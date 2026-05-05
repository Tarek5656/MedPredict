import pandas as pd
import numpy as np
import os

# Liste des maladies communes en Français
DISEASES = {
    "Grippe": {
        "symptoms": ["fièvre", "toux", "fatigue", "douleurs musculaires", "frissons", "mal de gorge"],
        "age_range": (0, 100),
        "gender_bias": None
    },
    "Rhume": {
        "symptoms": ["toux", "mal de gorge", "congestion nasale", "éternuements", "maux de tête"],
        "age_range": (0, 100),
        "gender_bias": None
    },
    "COVID-19": {
        "symptoms": ["fièvre", "toux", "essoufflement", "fatigue", "perte d'odorat ou du goût", "douleurs musculaires"],
        "age_range": (0, 100),
        "gender_bias": None
    },
    "Diabète": {
        "symptoms": ["envie fréquente d'uriner", "soif excessive", "fatigue", "vision floue", "appétit augmenté"],
        "age_range": (30, 90),
        "gender_bias": None
    },
    "Hypertension": {
        "symptoms": ["maux de tête", "vertiges", "oppression thoracique", "palpitations", "essoufflement", "bourdonnements d'oreilles"],
        "age_range": (40, 95),
        "gender_bias": None
    },
    "Asthme": {
        "symptoms": ["essoufflement", "sifflement respiratoire", "oppression thoracique", "toux"],
        "age_range": (5, 60),
        "gender_bias": None
    },
    "Allergies": {
        "symptoms": ["éternuements", "congestion nasale", "yeux qui grattent", "larmoiement", "éruption cutanée"],
        "age_range": (0, 70),
        "gender_bias": None
    },
    "Infection urinaire": {
        "symptoms": ["douleur à la miction", "envie fréquente d'uriner", "douleur au bas-ventre", "sang dans les urines", "urine trouble ou odorante"],
        "age_range": (15, 80),
        "gender_bias": "F"
    },
    "Angine": {
        "symptoms": ["mal de gorge", "fièvre", "ganglions gonflés", "difficulté à avaler", "gorge rouge"],
        "age_range": (3, 40),
        "gender_bias": None
    },
    "Anémie": {
        "symptoms": ["fatigue", "faiblesse", "pâleur", "vertiges", "essoufflement"],
        "age_range": (0, 100),
        "gender_bias": "F"
    },
    "Migraine": {
        "symptoms": ["maux de tête", "nausées", "vomissements", "sensibilité à la lumière", "troubles visuels"],
        "age_range": (15, 60),
        "gender_bias": "F"
    },
    "Gastro-entérite": {
        "symptoms": ["nausées", "vomissements", "diarrhée", "douleur au bas-ventre", "fatigue"],
        "age_range": (0, 90),
        "gender_bias": None
    },
    "Pneumonie": {
        "symptoms": ["toux", "fièvre", "essoufflement", "douleur thoracique", "fatigue"],
        "age_range": (0, 100),
        "gender_bias": None
    },
    "Varicelle": {
        "symptoms": ["éruption cutanée", "fièvre", "fatigue", "yeux qui grattent"],
        "age_range": (1, 15),
        "gender_bias": None
    },
    "Otite": {
        "symptoms": ["douleur à l'oreille", "fièvre", "diminution de l'audition"],
        "age_range": (0, 40),
        "gender_bias": None
    },
    "Sinusite": {
        "symptoms": ["congestion nasale", "maux de tête", "douleur faciale", "perte d'odorat ou du goût"],
        "age_range": (10, 80),
        "gender_bias": None
    },
    "Conjonctivite": {
        "symptoms": ["yeux rouges", "yeux qui grattent", "larmoiement", "vision floue"],
        "age_range": (0, 80),
        "gender_bias": None
    },
    "Dépression": {
        "symptoms": ["tristesse / déprime", "fatigue", "troubles du sommeil", "perte d'appétit"],
        "age_range": (15, 90),
        "gender_bias": None
    },
    "Calculs rénaux": {
        "symptoms": ["douleur au flanc", "sang dans les urines", "nausées", "vomissements"],
        "age_range": (20, 70),
        "gender_bias": "M"
    }
}

# Tous les symptômes possibles
ALL_SYMPTOMS = set()
for d in DISEASES.values():
    ALL_SYMPTOMS.update(d["symptoms"])

ALL_SYMPTOMS = sorted(list(ALL_SYMPTOMS))

def generate_dataset(n_samples=20000):
    rows = []
    diseases_list = list(DISEASES.keys())
    
    for _ in range(n_samples):
        disease_name = np.random.choice(diseases_list)
        d_info = DISEASES[disease_name]
        
        age = np.random.randint(d_info["age_range"][0], d_info["age_range"][1] + 1)
        
        if d_info["gender_bias"] == "F":
            gender = np.random.choice(["F", "M"], p=[0.8, 0.2])
        elif d_info["gender_bias"] == "M":
            gender = np.random.choice(["F", "M"], p=[0.2, 0.8])
        else:
            gender = np.random.choice(["F", "M"])
            
        symptom_vector = {s: 0 for s in ALL_SYMPTOMS}
        for s in d_info["symptoms"]:
            symptom_vector[s] = 1 if np.random.random() < 0.90 else 0
            
        # Add slight noise
        noise_symptoms = np.random.choice(ALL_SYMPTOMS, size=np.random.randint(0, 2), replace=False)
        for ns in noise_symptoms:
            if ns not in d_info["symptoms"]:
                symptom_vector[ns] = 1 if np.random.random() < 0.05 else 0
                
        row = {
            "diseases": disease_name,
            "age": age,
            "gender": gender
        }
        row.update(symptom_vector)
        rows.append(row)
        
    return pd.DataFrame(rows)

if __name__ == "__main__":
    df = generate_dataset(20000)
    save_path = os.path.join(os.path.dirname(__file__), "dataset_prototype.csv")
    df.to_csv(save_path, index=False)
    print(f"Dataset prototype (FR) généré: {save_path} ({df.shape[0]} lignes)")
