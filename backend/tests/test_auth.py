from contextlib import contextmanager
from datetime import datetime, timezone
from types import SimpleNamespace

import jwt
import pytest

from app import auth


def test_access_token_contains_server_issued_identity(monkeypatch):
    monkeypatch.setattr(
        auth,
        'settings',
        lambda: SimpleNamespace(
            jwt_secret_key='x' * 48,
            jwt_issuer='issuer',
            jwt_audience='audience',
            access_token_minutes=15,
        ),
    )
    token = auth._access_token('user-id', 'tenant-a', 'user', ['workspace'])
    claims = jwt.decode(token, 'x' * 48, algorithms=['HS256'], issuer='issuer', audience='audience')
    assert claims['sub'] == 'user-id'
    assert claims['tenant'] == 'tenant-a'
    assert claims['role'] == 'user'


def test_cross_tenant_claim_is_rejected(monkeypatch):
    class FakeConnection:
        def __enter__(self):
            return self

        def __exit__(self, *_):
            return False

        def execute(self, *_):
            return self

        def fetchone(self):
            return {'tenant_id': 'tenant-b', 'role': 'user', 'disabled': False}

    monkeypatch.setattr(auth, 'connection', lambda: FakeConnection())
    with pytest.raises(Exception) as error:
        auth._principal_from_claims({
            'type': 'access',
            'sub': '00000000-0000-0000-0000-000000000001',
            'tenant': 'tenant-a',
            'role': 'user',
            'groups': ['workspace'],
        })
    assert getattr(error.value, 'status_code', None) == 401
