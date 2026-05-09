from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db import transaction

from .models import Notification

User = get_user_model()

def notify_group(group_name: str, *, type: str, title: str, body: str = "", url: str = "") -> int:
    """
    Crée une notification pour chaque user du groupe.
    Retourne le nombre de notifications créées.
    """
    try:
        group = Group.objects.get(name=group_name)
    except Group.DoesNotExist:
        return 0

    users = group.user_set.all().only("id")
    notifs = [
        Notification(user=u, type=type, title=title, body=body, url=url)
        for u in users
    ]
    with transaction.atomic():
        Notification.objects.bulk_create(notifs)
    return len(notifs)


def notify_user(user, *, type: str, title: str, body: str = "", url: str = "") -> Notification:
    """
    Crée une notification pour un utilisateur spécifique.
    """
    notif = Notification(user=user, type=type, title=title, body=body, url=url)
    notif.save()
    return notif