import uuid
from app.core.db import connection
from app.core.config import settings

def assert_owned(tenant: str, conversation_id: uuid.UUID, owner_sub: str) -> None:
    with connection() as conn:
        owned = conn.execute(
            'SELECT 1 FROM conversations WHERE id=%s AND tenant_id=%s AND owner_sub=%s',
            (conversation_id, tenant, owner_sub),
        ).fetchone()
    if not owned:
        raise PermissionError('Conversation does not belong to the authenticated user')

def history(tenant: str, conversation_id: uuid.UUID, owner_sub: str):
    with connection() as conn:
        rows = conn.execute("""SELECT role,content FROM (
            SELECT id,role,content,created_at FROM chat_messages
            WHERE tenant_id=%s AND conversation_id=%s
              AND EXISTS (SELECT 1 FROM conversations WHERE id=%s AND tenant_id=%s AND owner_sub=%s)
            ORDER BY id DESC LIMIT %s
        ) recent ORDER BY id ASC""",
        (tenant,conversation_id,conversation_id,tenant,owner_sub,settings().memory_turns*2)).fetchall()
    return rows

def save_turn(tenant: str, conversation_id: uuid.UUID, owner_sub: str, question: str, response: str):
    with connection() as conn:
        conn.execute(
            'INSERT INTO conversations(id,tenant_id,owner_sub) VALUES (%s,%s,%s) ON CONFLICT (id) DO NOTHING',
            (conversation_id, tenant, owner_sub),
        )
        owned = conn.execute(
            'SELECT 1 FROM conversations WHERE id=%s AND tenant_id=%s AND owner_sub=%s',
            (conversation_id, tenant, owner_sub),
        ).fetchone()
        if not owned:
            raise PermissionError('Conversation does not belong to the authenticated user')
        conn.execute("""INSERT INTO chat_messages(tenant_id,conversation_id,role,content)
                        VALUES (%s,%s,'user',%s),(%s,%s,'assistant',%s)""",
                     (tenant,conversation_id,question,tenant,conversation_id,response))

def list_messages(tenant: str, conversation_id: uuid.UUID, owner_sub: str):
    with connection() as conn:
        return conn.execute("""SELECT role,content,created_at FROM chat_messages
          WHERE tenant_id=%s AND conversation_id=%s
            AND EXISTS (SELECT 1 FROM conversations WHERE id=%s AND tenant_id=%s AND owner_sub=%s)
          ORDER BY id ASC LIMIT 100""",
          (tenant,conversation_id,conversation_id,tenant,owner_sub)).fetchall()
