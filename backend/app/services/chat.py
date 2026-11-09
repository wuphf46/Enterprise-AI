import uuid

from fastapi import HTTPException

from app.core.config import settings
from app.core.db import connection, audit
from app.core.principal import Principal
from app.services.rag.guardrails import classify_input
from app.services.rag.memory import assert_owned, history, save_turn, list_messages
from app.services.rag.pipeline import chat as run_chat


def ask(p: Principal, question: str, conversation_id: uuid.UUID | None = None) -> dict:
    reason = classify_input(question)
    if reason:
        with connection() as conn:
            audit(conn, p.subject, p.tenant, 'guardrail_input_blocked', {'reason': reason})
        raise HTTPException(400, f'Input guardrail blocked this request ({reason}).')
    if settings().hitl_enabled and any(x in question.lower() for x in ('delete', 'export', 'send to', 'update policy')):
        with connection() as conn:
            row = conn.execute('INSERT INTO approvals(tenant_id,requester,question,status) VALUES (%s,%s,%s,%s) RETURNING id', (p.tenant, p.subject, question, 'pending')).fetchone()
            audit(conn, p.subject, p.tenant, 'approval_requested', {'id': str(row['id'])})
        return {'answer': 'This request requires administrator approval before any action. Open the Approvals tab to review it.', 'sources': [], 'status': 'pending_approval', 'approval_id': str(row['id'])}
    provided_conversation = conversation_id is not None
    conversation_id = conversation_id or uuid.uuid4()
    if provided_conversation:
        try:
            assert_owned(p.tenant, conversation_id, p.subject)
        except PermissionError as exc:
            raise HTTPException(403, 'Conversation access denied') from exc
    prior = history(p.tenant, conversation_id, p.subject)
    result = run_chat(p, question, prior)
    try:
        save_turn(p.tenant, conversation_id, p.subject, question, result['answer'])
    except PermissionError as exc:
        raise HTTPException(403, 'Conversation access denied') from exc
    if result.get('answer') == 'The response was blocked by the sensitive-data output guardrail.':
        with connection() as conn:
            audit(conn, p.subject, p.tenant, 'guardrail_output_blocked', {'conversation_id': str(conversation_id)})
        result['status'] = 'guardrail_blocked'
        result['sources'] = []
    return {**result, 'conversation_id': str(conversation_id)}


def conversation_messages(p: Principal, conversation_id: uuid.UUID) -> dict:
    return {'conversation_id': str(conversation_id), 'messages': list_messages(p.tenant, conversation_id, p.subject)}
