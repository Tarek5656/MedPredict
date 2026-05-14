import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from .models import Message, Conversation

User = get_user_model()

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        
        if self.user.is_anonymous:
            await self.close()
            return

        # Chaque utilisateur a son propre groupe pour recevoir des messages privés
        self.user_group_name = f"user_{self.user.id}"
        await self.channel_layer.group_add(
            self.user_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "user_group_name"):
            await self.channel_layer.group_discard(
                self.user_group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        data = json.loads(text_data)
        message_content = data.get("message")
        receiver_id = data.get("receiver_id")
        conversation_id = data.get("conversation_id")

        if not message_content or not receiver_id:
            return

        # Sauvegarde en DB
        message_obj = await self.save_message(self.user.id, receiver_id, message_content, conversation_id)

        # Envoyer au destinataire
        receiver_group_name = f"user_{receiver_id}"
        await self.channel_layer.group_send(
            receiver_group_name,
            {
                "type": "chat_message",
                "message": message_content,
                "sender_id": self.user.id,
                "sender_username": self.user.username,
                "conversation_id": message_obj.conversation.id,
                "timestamp": str(message_obj.timestamp)
            }
        )
        
        # Confirmer à l'expéditeur (pour mise à jour UI)
        await self.send(text_data=json.dumps({
            "type": "message_sent",
            "message": message_content,
            "sender_id": self.user.id,
            "receiver_id": receiver_id,
            "conversation_id": message_obj.conversation.id,
            "timestamp": str(message_obj.timestamp)
        }))

    async def chat_message(self, event):
        # Envoi effectif via WebSocket
        await self.send(text_data=json.dumps(event))

    @database_sync_to_async
    def save_message(self, sender_id, receiver_id, content, conversation_id=None):
        sender = User.objects.get(id=sender_id)
        receiver = User.objects.get(id=receiver_id)
        
        if conversation_id:
            conversation = Conversation.objects.get(id=conversation_id)
        else:
            # Trouver ou créer une conversation entre les deux
            conversation = Conversation.objects.filter(participants=sender).filter(participants=receiver).first()
            if not conversation:
                conversation = Conversation.objects.create()
                conversation.participants.add(sender, receiver)
        
        message = Message.objects.create(
            conversation=conversation,
            sender=sender,
            content=content
        )
        conversation.save() # Pour mettre à jour updated_at
        return message
