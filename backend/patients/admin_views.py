from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from django.contrib.auth.models import User, Group
from patients.models import Patient
from consultations.models import Consultation
from rendezvous.models import RendezVous

@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_stats(request):
    """
    Returns global system statistics for the admin dashboard.
    """
    total_patients = Patient.objects.count()
    total_consultations = Consultation.objects.count()
    total_rendezvous = RendezVous.objects.count()
    
    # Get user distribution
    users = User.objects.all()
    total_users = users.count()
    
    # Count by roles
    medecins_count = User.objects.filter(groups__name='MEDECIN').count()
    secretaires_count = User.objects.filter(groups__name='SECRETAIRE').count()
    patients_count = User.objects.filter(groups__name='PATIENT').count()
    admins_count = User.objects.filter(is_superuser=True).count()
    
    return Response({
        "total_patients": total_patients,
        "total_consultations": total_consultations,
        "total_rendezvous": total_rendezvous,
        "total_users": total_users,
        "roles_distribution": {
            "medecins": medecins_count,
            "secretaires": secretaires_count,
            "patients": patients_count,
            "admins": admins_count
        }
    })

@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_users_list(request):
    """
    Returns a list of all users with their roles.
    """
    users = User.objects.all().prefetch_related('groups').order_by('-date_joined')
    
    data = []
    for user in users:
        roles = list(user.groups.values_list('name', flat=True))
        if user.is_superuser and "ADMIN" not in roles:
            roles.append("ADMIN")
            
        data.append({
            "id": user.id,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "is_active": user.is_active,
            "date_joined": user.date_joined,
            "roles": roles
        })
        
    return Response(data)

@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def admin_update_user_status(request, user_id):
    """
    Enable or disable a user account.
    """
    try:
        user = User.objects.get(id=user_id)
        
        # Prevent self-deactivation
        if user.id == request.user.id and request.data.get('is_active') is False:
            return Response({"error": "Vous ne pouvez pas désactiver votre propre compte."}, status=400)
            
        is_active = request.data.get('is_active', user.is_active)
        user.is_active = is_active
        user.save()
        return Response({"status": "success", "is_active": user.is_active})
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=404)

@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_recent_activity(request):
    """
    Returns recent activities: last 5 consultations and last 5 new users.
    """
    recent_users = User.objects.order_by('-date_joined')[:5]
    users_data = [{"id": u.id, "username": u.username, "date": u.date_joined, "type": "NEW_USER"} for u in recent_users]
    
    recent_consults = Consultation.objects.order_by('-created_at')[:5]
    consults_data = [{"id": c.id, "patient": f"{c.patient.prenom} {c.patient.nom}", "medecin": c.medecin.username, "date": c.created_at, "type": "CONSULTATION"} for c in recent_consults]
    
    # Combine and sort by date descending
    all_activity = users_data + consults_data
    all_activity.sort(key=lambda x: x['date'], reverse=True)
    
    return Response(all_activity[:8])

import urllib.request
import urllib.error

@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_system_health(request):
    """
    Check the health of external services (like the AI service).
    """
    health = {
        "database": "Online",
        "ai_service": "Checking...",
        "ai_latency_ms": 0,
        "predictions_today": Consultation.objects.exclude(ai_predicted_disease="").count()
    }
    
    import time
    start = time.time()
    try:
        # In docker-compose, AI service is at http://ai-service:5000
        req = urllib.request.urlopen('http://ai-service:5000/api/health', timeout=2)
        if req.getcode() == 200:
            health["ai_service"] = "Online"
            health["ai_latency_ms"] = int((time.time() - start) * 1000)
        else:
            health["ai_service"] = "Degraded"
    except Exception:
        health["ai_service"] = "Offline"
        
    return Response(health)

@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_create_user(request):
    """
    Creates a new user and assigns a role.
    """
    data = request.data
    username = data.get('username')
    password = data.get('password')
    email = data.get('email', '')
    first_name = data.get('first_name', '')
    last_name = data.get('last_name', '')
    role = data.get('role') # MEDECIN, SECRETAIRE, ADMIN

    if not username or not password or not role:
        return Response({"error": "Nom d'utilisateur, mot de passe et rôle sont obligatoires."}, status=400)

    if User.objects.filter(username=username).exists():
        return Response({"error": "Cet utilisateur existe déjà."}, status=400)

    user = User.objects.create_user(
        username=username,
        password=password,
        email=email,
        first_name=first_name,
        last_name=last_name
    )

    if role == 'ADMIN':
        user.is_superuser = True
        user.is_staff = True
        user.save()
    else:
        group, _ = Group.objects.get_or_create(name=role)
        user.groups.add(group)

    return Response({
        "status": "success", 
        "user": {
            "id": user.id,
            "username": user.username,
            "roles": [role]
        }
    })
