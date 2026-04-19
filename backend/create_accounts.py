import os
import django
import sys

# Add the current directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User, Group
from patients.models import Patient, DossierMedical

def create_role_user(username, password, group_name, first_name, last_name, is_patient=False):
    # Ensure group exists
    group, _ = Group.objects.get_or_create(name=group_name)
    
    # Create or update user
    user, created = User.objects.get_or_create(username=username)
    user.set_password(password)
    user.first_name = first_name
    user.last_name = last_name
    user.save()
    
    # Add to group (first clear to avoid duplicates if needed, or just add)
    user.groups.add(group)
    
    print(f"User {username} {'created' if created else 'updated'} and added to {group_name} group.")
    
    if is_patient:
        # Create Patient profile
        patient, p_created = Patient.objects.get_or_create(
            user=user,
            defaults={
                'prenom': first_name, 
                'nom': last_name,
                'email': f"{username}@example.com"
            }
        )
        # Create Dossier
        DossierMedical.objects.get_or_create(patient=patient)
        print(f"Patient profile and dossier {'created' if p_created else 'verified'} for {username}.")

if __name__ == "__main__":
    try:
        create_role_user("docteur_test", "password123", "MEDECIN", "Sarah", "Johnson")
        create_role_user("secretaire_test", "password123", "SECRETAIRE", "Jean", "Dupont")
        create_role_user("patient_test", "password123", "PATIENT", "Marie", "Curie", is_patient=True)
        print("\nAll test accounts are ready!")
        print("Doctor: docteur_test / password123")
        print("Secretary: secretaire_test / password123")
        print("Patient: patient_test / password123")
    except Exception as e:
        print(f"Error creating accounts: {e}")
