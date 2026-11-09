from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.db import connection
from app.core.principal import Principal
from app.core.security import (
    REFRESH_COOKIE,
    create_access_token,
    hash_refresh_token,
    issue_refresh_token,
    password_hash,
)
from app.deps import current_principal

router = APIRouter(prefix='/api/auth', tags=['auth'])


class LoginRequest(BaseModel):
    username: str = Field(min_length=3, max_length=160)
    password: str = Field(min_length=8, max_length=256)


class RegisterRequest(LoginRequest):
    tenant: str = Field(min_length=1, max_length=100)


def _user_row(username: str):
    with connection() as conn:
        return conn.execute(
            'SELECT id,username,password_hash,tenant_id,role,groups,disabled FROM users WHERE lower(username)=lower(%s)',
            (username,),
        ).fetchone()


@router.post('/login')
def auth_login(body: LoginRequest, response: Response):
    user = _user_row(body.username)
    if not user or user['disabled'] or not password_hash.verify(body.password, user['password_hash']):
        raise HTTPException(status_code=401, detail='Invalid username or password')
    issue_refresh_token(response, str(user['id']))
    return {
        'access_token': create_access_token(str(user['id']), user['tenant_id'], user['role'], list(user['groups'])),
        'token_type': 'bearer',
    }


@router.post('/register', status_code=201)
def auth_register(body: RegisterRequest):
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


@router.post('/refresh')
def auth_refresh(response: Response, refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE)):
    if not refresh_token:
        raise HTTPException(status_code=401, detail='Refresh session expired')
    token_hash = hash_refresh_token(refresh_token)
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
    issue_refresh_token(response, str(row['user_id']))
    return {'access_token': create_access_token(str(row['user_id']), row['tenant_id'], row['role'], list(row['groups'])), 'token_type': 'bearer'}


@router.post('/logout')
def auth_logout(response: Response, refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE)):
    if refresh_token:
        with connection() as conn:
            conn.execute('UPDATE refresh_tokens SET revoked_at=now() WHERE token_hash=%s', (hash_refresh_token(refresh_token),))
    response.delete_cookie(REFRESH_COOKIE, path='/api/auth')
    return {'logged_out': True}


@router.get('/me')
def auth_me(p: Principal = Depends(current_principal)):
    with connection() as conn:
        user = conn.execute('SELECT username,tenant_id,role,groups FROM users WHERE id=%s', (p.subject,)).fetchone()
    return {'id': p.subject, 'username': user['username'], 'tenant': user['tenant_id'], 'role': user['role'], 'groups': user['groups']}
