# 🏥 MedPredict

![React](https://img.shields.io/badge/Frontend-React-61DAFB?logo=react&logoColor=black)
![Django](https://img.shields.io/badge/Backend-Django-092E20?logo=django&logoColor=white)
![Flask](https://img.shields.io/badge/AI_Microservice-Flask-000000?logo=flask&logoColor=white)
![Docker](https://img.shields.io/badge/Infrastructure-Docker-2496ED?logo=docker&logoColor=white)
![Ollama](https://img.shields.io/badge/LLM-Ollama-white?logo=ollama&logoColor=black)

> Une plateforme full-stack de gestion médicale avec prédiction de maladies par IA, messagerie en temps réel, intégration de chatbot WhatsApp et prise de rendez-vous — conçue pour les cliniques et cabinets médicaux.

---

## 📋 Table des Matières

- [Vue d'ensemble](#vue-densemble)
- [Fonctionnalités](#fonctionnalités)
- [Stack Technique](#stack-technique)
- [Architecture](#architecture)
- [Pour Commencer](#pour-commencer)
- [Variables d'Environnement](#variables-denvironnement)
- [Rôles & Permissions](#rôles--permissions)
- [Équipe & Contributions](#équipe--contributions)

---

## Vue d'ensemble

MedPredict est un système de gestion de clinique complet et collaboratif conçu pour numériser l'ensemble du parcours patient — de la prise de rendez-vous à la consultation, la prescription et le suivi.

La plateforme repose sur une architecture microservices distribuée. Elle intègre une IA conversationnelle locale (Mistral via Ollama) et un moteur de machine learning dédié pour la prédiction de maladies basée sur les symptômes. Elle inclut également un chatbot WhatsApp en libre-service pour les patients et une messagerie WebSocket en temps réel entre les médecins et le personnel de la clinique.

---

## Fonctionnalités

### 🧑‍⚕️ Gestion des Patients
- Dossiers patients complets incluant la démographie, le groupe sanguin et les antécédents médicaux.
- Dossier médical personnel pour le suivi des antécédents médicaux familiaux et personnels.
- Contrôle d'accès basé sur les rôles garantissant la confidentialité des données.

### 📅 Prise de Rendez-Vous
- Création, modification et annulation de rendez-vous avec durées et motifs spécifiques.
- Suivi automatisé du cycle de vie des statuts (En attente → Planifié → Terminé).
- Rappels par SMS et WhatsApp (24h avant, 10 min avant) propulsés par **Twilio**.
- Vues calendrier interactives (jour/semaine) dans le tableau de bord frontend.

### 🩺 Consultations & Ordonnances
- Dossiers de consultation structurés avec notes cliniques et diagnostics.
- Ordonnances imprimables détaillant le nom des médicaments, les dosages, les fréquences et les durées.
- Historique complet des consultations par patient.

### 🤖 IA de Prédiction de Maladies & NLP
- **Classification des Maladies :** La saisie des symptômes est dirigée vers un **microservice IA Python/Flask** dédié.
- **Moteur ML :** Utilise un `HistGradientBoostingClassifier` pour analyser les données structurées des patients, gérant nativement les valeurs manquantes pour fournir des scores de confiance de diagnostic précis.
- **IA Conversationnelle :** Intègre un LLM local (Mistral via **Ollama**) pour traiter le langage naturel, extraire les symptômes des patients et alimenter le chatbot interactif WhatsApp en toute sécurité, sans envoyer de requêtes médicales sensibles à des API tierces.

### 💬 Chatbot WhatsApp & Messagerie en Temps Réel
- Interaction automatisée avec les patients via WhatsApp pour les demandes de rendez-vous et la saisie des symptômes.
- Système de messagerie interne en temps réel utilisant les WebSockets pour faciliter la communication fluide entre les médecins et le personnel administratif.

---

## Stack Technique

**Frontend :**
- React (JavaScript/Vite)
- HTML5 / CSS3 / JavaScript

**Backend Core :**
- Django (Python)
- Django REST Framework
- WebSockets pour la messagerie en temps réel

**Microservice IA :**
- Python (Flask)
- Scikit-Learn (`HistGradientBoostingClassifier`)
- Ollama (Intégration LLM local)

**Infrastructure & Intégrations :**
- Docker & Docker Compose
- API Twilio (SMS / WhatsApp)

---

## Architecture

Le système est décomposé en trois services principaux communiquant via des API REST et des WebSockets :
1. **Client Frontend :** Une application React responsive servant d'interface utilisateur pour les médecins et le personnel.
2. **Backend Principal :** Un serveur Django gérant la logique métier principale, les opérations de base de données, l'authentification, les intégrations Twilio et les webhooks du bot WhatsApp.
3. **Moteur IA :** Un microservice Flask isolé hébergeant le modèle de prédiction Scikit-Learn et s'interfaçant avec l'instance locale Ollama pour les tâches de NLP.

---

## Pour Commencer

### Prérequis
- [Docker](https://www.docker.com/) et Docker Compose installés.
- Node.js & npm (si vous exécutez le frontend en dehors de Docker).
- Python 3.x.

### Installation

1. **Cloner le dépôt :**
   ```bash
   git clone https://github.com/gitHamzaHam/MedPredict.git
   cd MedPredict
   ```

2. **Configurer les variables d'environnement :**
   Copiez les fichiers d'environnement d'exemple et configurez vos clés locales (ex: identifiants Twilio, URI de base de données).
   ```bash
   cp .env.example .env
   ```

3. **Lancer les conteneurs :**
   Le projet est entièrement conteneurisé avec Docker pour faciliter le déploiement.
   ```bash
   docker-compose up --build
   ```

4. **Accéder à l'application :**
   - Frontend : `http://localhost:5173`
   - API Django : `http://localhost:8000`
   - Service IA Flask : `http://localhost:5000`

---

## Variables d'Environnement

Assurez-vous que les variables suivantes sont définies dans votre fichier `.env` (à ne jamais commiter sur Git) :

```env
# Django
DJANGO_SECRET_KEY=votre_cle_secrete_django
DJANGO_DEBUG=True

# PostgreSQL
POSTGRES_DB=medpredict
POSTGRES_USER=votre_utilisateur
POSTGRES_PASSWORD=votre_mot_de_passe
POSTGRES_HOST=db
POSTGRES_PORT=5432

# Redis / Celery
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/1
CHANNEL_LAYERS_REDIS_URL=redis://redis:6379/2

# Microservice IA
AI_SERVICE_URL=http://ai-service:5000

# Twilio (WhatsApp & SMS)
TWILIO_ACCOUNT_SID=votre_account_sid
TWILIO_AUTH_TOKEN=votre_auth_token
TWILIO_FROM_NUMBER=whatsapp:+1234567890
```

---

## Rôles & Permissions

- **Administrateur :** Accès complet à tous les paramètres du système, à la gestion des utilisateurs et aux dossiers de tous les patients de la clinique.
- **Médecin :** Accès aux dossiers des patients assignés, à l'historique personnel des consultations, aux outils de diagnostic IA et à la génération d'ordonnances.
- **Réceptionniste / Personnel :** Accès à la planification des rendez-vous, aux données démographiques de base des patients et à la messagerie du personnel en temps réel.

---

## Équipe & Contributions

MedPredict a été conçu comme un effort d'ingénierie full-stack collaboratif :
- **Architecture Core & Intégration WhatsApp :** Conception de l'architecture backend initiale, du routage des microservices et implémentation de la logique du chatbot WhatsApp. (https://github.com/TarekCharf)
- **Intégration Full-Stack & Finalisation IA :** Développement du frontend React, intégration du microservice IA Flask (`HistGradientBoostingClassifier`) et assemblage final de l'application.(https://github.com/TarekCharf)(https://github.com/gitHamzaHam)

---
