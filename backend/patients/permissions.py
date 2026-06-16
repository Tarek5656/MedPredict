from rest_framework.permissions import BasePermission, SAFE_METHODS

def user_in_group(user, group_name: str) -> bool:
    return user.is_authenticated and user.groups.filter(name=group_name).exists()

class IsSecretaire(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_superuser or user_in_group(request.user, "SECRETAIRE")

class IsMedecin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_superuser or user_in_group(request.user, "MEDECIN")
    
class IsSecretaireOrMedecin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_superuser or user_in_group(request.user, "SECRETAIRE") or user_in_group(request.user, "MEDECIN")
    
class IsPatient(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_superuser or user_in_group(request.user, "PATIENT")
    
class CanCancelRdv(BasePermission):
    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        groups = set(user.groups.values_list("name", flat=True))

        if "SECRETAIRE" in groups:
            return True

        if "PATIENT" in groups:
            return getattr(obj.patient, "user_id", None) == user.id

        return False