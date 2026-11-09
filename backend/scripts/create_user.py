"""Create a local-auth user without printing or storing the password."""
import getpass
import sys
from pathlib import Path

from dotenv import load_dotenv
from pwdlib import PasswordHash

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'backend'))
load_dotenv(ROOT / 'backend' / '.env')

from app.core.db import connection  # noqa: E402


def main() -> int:
    username = input('Username: ').strip()
    tenant = input('Tenant: ').strip()
    role = input('Role [user/admin]: ').strip().lower() or 'user'
    password = getpass.getpass('Password: ')
    if not username or not tenant or role not in {'user', 'admin'} or len(password) < 8:
        print('ERROR: provide valid values; passwords must be at least 8 characters.')
        return 1
    with connection() as conn:
        conn.execute(
            """INSERT INTO users(username,password_hash,tenant_id,role,groups)
               VALUES (%s,%s,%s,%s,ARRAY['workspace'])""",
            (username, PasswordHash.recommended().hash(password), tenant, role),
        )
    print(f'Created {role} user {username!r} in tenant {tenant!r}.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
