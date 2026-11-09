from fastapi import APIRouter, Depends

from app.core.db import connection
from app.core.principal import Principal
from app.deps import admin_principal

router = APIRouter(prefix='/api/admin', tags=['admin'])


@router.get('/metrics')
def metrics(p: Principal = Depends(admin_principal)):
    with connection() as conn:
        docs = conn.execute('SELECT status,count(*) AS total FROM documents WHERE tenant_id=%s GROUP BY status', (p.tenant,)).fetchall()
        fb = conn.execute('SELECT rating,count(*) AS total FROM feedback WHERE tenant_id=%s GROUP BY rating', (p.tenant,)).fetchall()
    return {'documents': docs, 'feedback': fb}


@router.get('/guardrails')
def guardrail_metrics(p: Principal = Depends(admin_principal)):
    with connection() as conn:
        rows = conn.execute("""SELECT action,count(*) AS total FROM audit_events
            WHERE tenant_id=%s AND action IN ('guardrail_input_blocked','guardrail_output_blocked')
            GROUP BY action ORDER BY action""", (p.tenant,)).fetchall()
    return {'events': rows, 'mode': 'deterministic_demo', 'managed_bedrock_guardrails': False}
