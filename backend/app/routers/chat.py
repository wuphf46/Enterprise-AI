import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.core.principal import Principal
from app.deps import current_principal
from app.services import chat as chat_service

router = APIRouter(tags=['chat'])


class Ask(BaseModel):
    question: str = Field(min_length=3, max_length=2000)
    conversation_id: uuid.UUID | None = None


@router.post('/api/chat')
def ask(body: Ask, p: Principal = Depends(current_principal)):
    return chat_service.ask(p, body.question, body.conversation_id)


@router.get('/api/conversations/{conversation_id}/messages')
def conversation_messages(conversation_id: uuid.UUID, p: Principal = Depends(current_principal)):
    return chat_service.conversation_messages(p, conversation_id)
