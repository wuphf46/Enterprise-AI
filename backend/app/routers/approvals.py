import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.db import connection, audit
from app.core.principal import Principal
from app.deps import admin_principal

router = APIRouter(prefix='/api/approvals', tags=['approvals'])


class ApprovalDecision(BaseModel):
    approve: bool


@router.get('')
def list_approvals(p: Principal = Depends(admin_principal)):
    with connection() as conn:
        rows = conn.execute("SELECT id,requester,question,status,reviewer,created_at,reviewed_at FROM approvals WHERE tenant_id=%s ORDER BY created_at DESC LIMIT 100", (p.tenant,)).fetchall()
    return {'approvals': rows}


@router.post('/{approval_id}/decision')
def decide(approval_id: uuid.UUID, body: ApprovalDecision, p: Principal = Depends(admin_principal)):
    with connection() as conn:
        row = conn.execute("UPDATE approvals SET status=%s,reviewer=%s,reviewed_at=now() WHERE id=%s AND tenant_id=%s AND status='pending' RETURNING id", ('approved' if body.approve else 'rejected', p.subject, approval_id, p.tenant)).fetchone()
        if not row:
            raise HTTPException(404, 'Pending approval not found')
        audit(conn, p.subject, p.tenant, 'approval_decided', {'id': str(approval_id), 'approved': body.approve})
    # Approval is a decision record only; it never automatically executes a destructive action.
    return {'status': 'approved' if body.approve else 'rejected', 'executed': False}
