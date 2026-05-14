from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Q
from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer, UserMinimalSerializer
from django.contrib.auth import get_user_model

User = get_user_model()

class MessagingViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'])
    def conversations(self, request):
        conversations = Conversation.objects.filter(participants=request.user)
        serializer = ConversationSerializer(conversations, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def contacts(self, request):
        # Liste des médecins et secrétaires (exclure les patients pour ce chat)
        contacts = User.objects.filter(
            Q(groups__name="MEDECIN") | Q(groups__name="SECRETAIRE")
        ).exclude(id=request.user.id).distinct()
        serializer = UserMinimalSerializer(contacts, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        try:
            conversation = Conversation.objects.get(id=pk, participants=request.user)
            messages = conversation.messages.all()
            serializer = MessageSerializer(messages, many=True)
            return Response(serializer.data)
        except Conversation.DoesNotExist:
            return Response({"error": "Conversation non trouvée"}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        try:
            conversation = Conversation.objects.get(id=pk, participants=request.user)
            conversation.messages.filter(is_read=False).exclude(sender=request.user).update(is_read=True)
            return Response({"status": "messages marqués comme lus"})
        except Conversation.DoesNotExist:
            return Response({"error": "Conversation non trouvée"}, status=status.HTTP_404_NOT_FOUND)
