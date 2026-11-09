from fastapi import APIRouter, HTTPException

from app.core.db import connection

router = APIRouter(prefix='/health', tags=['health'])


@router.get('/live')
def live():
    return {'status': 'alive'}


@router.get('/ready')
def ready():
    try:
        with connection() as conn:
            conn.execute('SELECT 1').fetchone()
        return {'status': 'ready'}
    except Exception as exc:
        raise HTTPException(503, 'Database unavailable') from exc
