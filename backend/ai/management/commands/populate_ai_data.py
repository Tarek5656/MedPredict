import json
from django.core.management.base import BaseCommand
from ai.models import Symptom, Disease
import os

class Command(BaseCommand):
    help = "Populate Symptom and Disease models from feature_columns.json and a list of diseases."

    def handle(self, *args, **options):
        # 1. Symptoms from feature_columns.json
        # On va chercher le fichier dans ai-service/models/feature_columns.json
        # Mais le container backend n'a pas accès au dossier ai-service.
        # On va plutôt passer par l'API du ai-service puisqu'on sait qu'elle marche.
        import requests
        from django.conf import settings
        
        self.stdout.write("Fetching symptoms from AI service...")
        try:
            r = requests.get(f"{settings.AI_SERVICE_URL}/api/features", timeout=10)
            features = r.json().get("features", [])
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Failed to fetch features: {e}"))
            return

        created_s = 0
        for code in features:
            if code in ["age", "gender"]:
                continue
            # On utilise le code comme label par défaut (on pourra améliorer plus tard)
            label = code.replace("_", " ").capitalize()
            _, created = Symptom.objects.get_or_create(code=code, defaults={"label": label})
            if created:
                created_s += 1
        
        self.stdout.write(self.style.SUCCESS(f"Successfully imported {len(features)} symptoms (created {created_s})."))

        # 2. Diseases
        self.stdout.write("Fetching diseases from AI service...")
        try:
            r = requests.get(f"{settings.AI_SERVICE_URL}/api/diseases", timeout=10)
            diseases = r.json().get("diseases", [])
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Failed to fetch diseases: {e}"))
            return

        created_d = 0
        for name in diseases:
            _, created = Disease.objects.get_or_create(name=name.strip())
            if created:
                created_d += 1
        
        self.stdout.write(self.style.SUCCESS(f"Successfully imported {len(diseases)} diseases (created {created_d})."))
        self.stdout.write("Done.")

