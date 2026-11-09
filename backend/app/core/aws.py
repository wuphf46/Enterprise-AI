from functools import lru_cache
import boto3
from app.core.config import settings


@lru_cache
def client(service):
    s = settings()

    if bool(s.aws_access_key_id) != bool(s.aws_secret_access_key):
        raise ValueError('Set both AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY, or neither.')
    options = {'region_name': s.aws_region}
    if s.aws_access_key_id and s.aws_secret_access_key:
        options.update(aws_access_key_id=s.aws_access_key_id,
                       aws_secret_access_key=s.aws_secret_access_key)

    return boto3.client(service, **options)
