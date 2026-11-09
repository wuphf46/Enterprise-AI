import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Response
from pwdlib import PasswordHash

from app.core.config import settings
from app.core.db import connection

password_hash = PasswordHash.recommended()
REFRESH_COOKIE = 'enterprise_ai_refresh'


def jwt_secret() -> str:
    value = settings().jwt_secret_key
    if len(value) < 32:
        raise RuntimeError('JWT_SECRET_KEY must be configured with at least 32 characters')
    return value


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


def create_access_token(user_id: str, tenant: str, role: str, groups: list[str]) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        'sub': user_id,
        'tenant': tenant,
        'role': role,
        'groups': groups,
        'iss': settings().jwt_issuer,
        'aud': settings().jwt_audience,
        'iat': now,
        'exp': now + timedelta(minutes=settings().access_token_minutes),
        'type': 'access',
    }
    return jwt.encode(payload, jwt_secret(), algorithm='HS256')


def issue_refresh_token(response: Response, user_id: str) -> None:
    raw = secrets.token_urlsafe(48)
    expires = datetime.now(timezone.utc) + timedelta(days=settings().refresh_token_days)
    with connection() as conn:
        conn.execute(
            'INSERT INTO refresh_tokens(token_hash,user_id,expires_at) VALUES (%s,%s,%s)',
            (hash_refresh_token(raw), uuid.UUID(user_id), expires),
        )
    response.set_cookie(
        REFRESH_COOKIE,
        raw,
        max_age=settings().refresh_token_days * 86400,
        httponly=True,
        secure=settings().auth_cookie_secure,
        samesite='lax',
        path='/api/auth',
    )
