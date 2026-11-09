import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Cookie, Depends, HTTPException, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from pwdlib import PasswordHash

from app.config import settings
from app.db import connection
from app.demo_context import Principal

password_hash = PasswordHash.recommended()
bearer = HTTPBearer(auto_error=False)
REFRESH_COOKIE = 'enterprise_ai_refresh'


class LoginRequest(BaseModel):
    username: str = Field(min_length=3, max_length=160)
    password: str = Field(min_length=8, max_length=256)


class RegisterRequest(LoginRequest):
    tenant: str = Field(min_length=1, max_length=100)


def _secret() -> str:
    value = settings().jwt_secret_key
    if len(value) < 32:
        raise RuntimeError('JWT_SECRET_KEY must be configured with at least 32 characters')
    return value


def _hash_refresh(token: str) -> str:
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


def _access_token(user_id: str, tenant: str, role: str, groups: list[str]) -> str:
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
    return jwt.encode(payload, _secret(), algorithm='HS256')


def _issue_refresh(response: Response, user_id: str) -> None:
    raw = secrets.token_urlsafe(48)
    expires = datetime.now(timezone.utc) + timedelta(days=settings().refresh_token_days)
    with connection() as conn:
        conn.execute(
            'INSERT INTO refresh_tokens(token_hash,user_id,expires_at) VALUES (%s,%s,%s)',
            (_hash_refresh(raw), uuid.UUID(user_id), expires),
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


def _user_row(username: str):
    with connection() as conn:
        return conn.execute(
            'SELECT id,username,password_hash,tenant_id,role,groups,disabled FROM users WHERE lower(username)=lower(%s)',
            (username,),
        ).fetchone()


def _principal_from_claims(claims: dict) -> Principal:
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
            _secret(),
            algorithms=['HS256'],
            issuer=settings().jwt_issuer,
            audience=settings().jwt_audience,
        )
    except (jwt.PyJWTError, RuntimeError) as exc:
        raise HTTPException(status_code=401, detail='Invalid or expired access token') from exc
    return _principal_from_claims(claims)


def admin_principal(p: Principal = Depends(current_principal)) -> Principal:
    if not p.admin:
        raise HTTPException(status_code=403, detail='Admin access required')
    return p


def login(response: Response, body: LoginRequest) -> dict:
    user = _user_row(body.username)
    if not user or user['disabled'] or not password_hash.verify(body.password, user['password_hash']):
        raise HTTPException(status_code=401, detail='Invalid username or password')
    _issue_refresh(response, str(user['id']))
    return {
        'access_token': _access_token(str(user['id']), user['tenant_id'], user['role'], list(user['groups'])),
        'token_type': 'bearer',
    }


def register(body: RegisterRequest) -> dict:
    if not settings().auth_allow_registration:
        raise HTTPException(status_code=404, detail='Registration is disabled')
    with connection() as conn:
        exists = conn.execute('SELECT 1 FROM users WHERE lower(username)=lower(%s)', (body.username,)).fetchone()
        if exists:
            raise HTTPException(status_code=409, detail='Username is already registered')
        row = conn.execute(
            """INSERT INTO users(username,password_hash,tenant_id,role,groups)
               VALUES (%s,%s,%s,'user',ARRAY['workspace']) RETURNING id""",
            (body.username, password_hash.hash(body.password), body.tenant),
        ).fetchone()
    return {'id': str(row['id']), 'username': body.username}


def refresh(response: Response, refresh_token: str | None) -> dict:
    if not refresh_token:
        raise HTTPException(status_code=401, detail='Refresh session expired')
    token_hash = _hash_refresh(refresh_token)
    with connection() as conn:
        row = conn.execute(
            """SELECT r.id,r.user_id,u.username,u.tenant_id,u.role,u.groups,u.disabled
               FROM refresh_tokens r JOIN users u ON u.id=r.user_id
               WHERE r.token_hash=%s AND r.revoked_at IS NULL AND r.expires_at>now()""",
            (token_hash,),
        ).fetchone()
        if not row or row['disabled']:
            raise HTTPException(status_code=401, detail='Refresh session expired')
        conn.execute('UPDATE refresh_tokens SET revoked_at=now() WHERE id=%s', (row['id'],))
    _issue_refresh(response, str(row['user_id']))
    return {'access_token': _access_token(str(row['user_id']), row['tenant_id'], row['role'], list(row['groups'])), 'token_type': 'bearer'}


def logout(response: Response, refresh_token: str | None) -> dict:
    if refresh_token:
        with connection() as conn:
            conn.execute('UPDATE refresh_tokens SET revoked_at=now() WHERE token_hash=%s', (_hash_refresh(refresh_token),))
    response.delete_cookie(REFRESH_COOKIE, path='/api/auth')
    return {'logged_out': True}
