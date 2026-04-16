from django.db import models

class Symptom(models.Model):
    # doit matcher EXACTEMENT une colonne du dataset / feature_columns.json
    code = models.CharField(max_length=120, unique=True)  # ex: "skin_rash"
    label = models.CharField(max_length=200, blank=True, default="")  # optionnel

    def __str__(self):
        return self.label or self.code

class Disease(models.Model):
    name = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return self.name