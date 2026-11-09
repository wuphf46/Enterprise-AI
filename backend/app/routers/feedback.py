from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.core.db import connection
from app.core.principal import Principal
from app.deps import current_principal

router = APIRouter(prefix='/api/feedback', tags=['feedback'])


class Feedback(BaseModel):
    document_id: str | None = None
    rating: int = Field(ge=-1, le=1)
    note: str = Field(default='', max_length=500)


@router.post('')
def feedback(body: Feedback, p: Principal = Depends(current_principal)):
    with connection() as conn:
        conn.execute('INSERT INTO feedback(tenant_id,actor,rating,note) VALUES (%s,%s,%s,%s)',
                     (p.tenant, p.subject, body.rating, body.note))
    return {'saved': True}
