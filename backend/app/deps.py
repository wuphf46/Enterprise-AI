import uuid

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings
from app.core.db import connection
from app.core.principal import Principal
from app.core.security import jwt_secret

bearer = HTTPBearer(auto_error=False)


def principal_from_claims(claims: dict) -> Principal:
    if claims.get('type') != 'access':
        raise HTTPException(status_code=401, detail='Invalid access token')
    try:
        user_id = uuid.UUID(str(claims['sub']))
        tenant = str(claims['tenant'])
        role = str(claims['role'])
    except (KeyError, ValueError, TypeError) as exc:
        raise HTTPException(status_code=401, detail='Invalid access token') from exc
    if role not in {'user', 'admin'}:
        raise HTTPException(status_code=401, detail='Invalid access token')
    with connection() as conn:
        user = conn.execute(
            'SELECT tenant_id,role,groups,disabled FROM users WHERE id=%s',
            (user_id,),
        ).fetchone()
    if not user or user['disabled'] or user['tenant_id'] != tenant or user['role'] != role:
        raise HTTPException(status_code=401, detail='Account is unavailable')
    return Principal(str(user_id), user['tenant_id'], tuple(str(value) for value in user['groups']), user['role'] == 'admin')


def current_principal(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> Principal:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Authentication required')
    try:
        claims = jwt.decode(
            credentials.credentials,
            jwt_secret(),
            algorithms=['HS256'],
            issuer=settings().jwt_issuer,
            audience=settings().jwt_audience,
        )
    except (jwt.PyJWTError, RuntimeError) as exc:
        raise HTTPException(status_code=401, detail='Invalid or expired access token') from exc
    return principal_from_claims(claims)


def admin_principal(p: Principal = Depends(current_principal)) -> Principal:
    if not p.admin:
        raise HTTPException(status_code=403, detail='Admin access required')
    return p
