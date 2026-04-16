import pandas as pd
from django.core.management.base import BaseCommand
from ai.models import Symptom, Disease

TARGET_COL = "diseases"  # ⚠️ adapte si ton CSV a un autre nom

class Command(BaseCommand):
    help = "Importe maladies + symptômes depuis un CSV (1 colonne maladie + colonnes symptômes 0/1)."

    def add_arguments(self, parser):
        parser.add_argument("csv_path", type=str)

    def handle(self, *args, **opts):
        path = opts["csv_path"]
        df = pd.read_csv(path)

        if TARGET_COL not in df.columns:
            raise Exception(f"Colonne cible '{TARGET_COL}' introuvable. Ex: {list(df.columns)[:20]}")

        symptom_cols = [c for c in df.columns if c != TARGET_COL]

        created_s = 0
        for code in symptom_cols:
            _, created = Symptom.objects.get_or_create(code=str(code).strip())
            if created:
                created_s += 1
        self.stdout.write(self.style.SUCCESS(f"Symptoms imported: {len(symptom_cols)} (created {created_s})"))

        diseases = sorted(set(df[TARGET_COL].dropna().astype(str).tolist()))
        created_d = 0
        for name in diseases:
            _, created = Disease.objects.get_or_create(name=name.strip())
            if created:
                created_d += 1
        self.stdout.write(self.style.SUCCESS(f"Diseases imported: {len(diseases)} (created {created_d})"))