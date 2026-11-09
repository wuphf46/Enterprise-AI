"""Apply the browser-upload CORS policy to the configured S3 bucket.

Usage (from project root): python backend/scripts/configure_s3_cors.py
Override the allowed origin(s) with FRONTEND_ORIGINS (comma-separated).
"""
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'backend'))
load_dotenv(ROOT / 'backend' / '.env')

from app.core.aws import client  # noqa: E402
from app.core.config import settings  # noqa: E402

CORS_FILE = ROOT / 'backend' / 'infra' / 's3-cors.json'
DEFAULT_ORIGIN = 'https://knova-enterprise-ai.vercel.app'


def main() -> int:
    bucket = settings().s3_bucket.strip()
    if not bucket:
        print('ERROR: Set S3_BUCKET in backend/.env.')
        return 1
    origins = [item.strip() for item in os.getenv('FRONTEND_ORIGINS', DEFAULT_ORIGIN).split(',') if item.strip()]
    if not origins:
        print('ERROR: FRONTEND_ORIGINS is empty.')
        return 1
    if not CORS_FILE.is_file():
        print(f'ERROR: CORS file not found: {CORS_FILE}')
        return 1
    cors = json.loads(CORS_FILE.read_text(encoding='utf-8'))
    for rule in cors.get('CORSRules', []):
        rule['AllowedOrigins'] = origins
    try:
        client('s3').put_bucket_cors(Bucket=bucket, CORSConfiguration=cors)
    except Exception as exc:
        print(f'ERROR: Could not apply S3 CORS: {type(exc).__name__}: {exc}')
        return 1
    print(f'SUCCESS: Applied S3 CORS to {bucket!r} for {", ".join(origins)}.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
