import logging
import uuid
from pathlib import Path

from fastapi import HTTPException

from app.core.aws import client
from app.core.config import settings
from app.core.db import connection, audit
from app.core.principal import Principal
from app.services.rag.vector_store import delete_document as delete_document_vectors
from worker.ingest import process_s3_key

log = logging.getLogger(__name__)

ALLOWED_SUFFIXES = {'.pdf', '.docx', '.txt', '.md'}


def create_upload(p: Principal, filename: str) -> dict:
    suffix = Path(filename).suffix.lower()
    if suffix not in ALLOWED_SUFFIXES:
        raise HTTPException(400, 'Allowed types: PDF, DOCX, TXT, MD')
    doc_id = str(uuid.uuid4())
    key = f'tenants/{p.tenant}/incoming/{doc_id}/v1{suffix}'
    with connection() as conn:
        conn.execute('''INSERT INTO documents(id,tenant_id,title,owner_sub,allowed_groups,s3_key,status,current_version)
                        VALUES (%s,%s,%s,%s,%s,%s,'pending',1)''',
                        (doc_id, p.tenant, filename, p.subject, ["workspace"], key))
        audit(conn, p.subject, p.tenant, 'upload_requested', {'document_id': doc_id})
    # Browser PUTs to S3; a separate completion request triggers synchronous ingestion.
    url = client('s3').generate_presigned_url('put_object', Params={'Bucket': settings().s3_bucket,
        'Key': key, 'ContentType': 'application/octet-stream'}, ExpiresIn=300)
    return {'document_id': doc_id, 'upload_url': url, 'headers': {'Content-Type': 'application/octet-stream'}}


def complete_upload(p: Principal, document_id: uuid.UUID) -> dict:
    with connection() as conn:
        row = conn.execute("""SELECT s3_key,status FROM documents
                            WHERE id=%s AND tenant_id=%s AND owner_sub=%s""",
                         (document_id, p.tenant, p.subject)).fetchone()
    if not row:
        raise HTTPException(404, 'Document not found')
    if row['status'] == 'ready':
        return {'status': 'ready'}
    if row['status'] == 'processing':
        raise HTTPException(409, 'Already processing')
    try:
        process_s3_key(row['s3_key'])
    except Exception as exc:
        raise HTTPException(502, 'Ingestion failed. Check server logs and document status.') from exc
    return {'status': 'ready'}


def list_documents(p: Principal) -> dict:
    with connection() as conn:
        rows = conn.execute('''SELECT id,title,status,current_version,created_at,allowed_groups FROM documents
            WHERE tenant_id=%s AND (allowed_groups && %s::text[] OR owner_sub=%s)
            ORDER BY created_at DESC LIMIT 100''', (p.tenant, list(p.groups), p.subject)).fetchall()
    return {'documents': rows}


def delete_document(p: Principal, document_id: uuid.UUID) -> dict:
    with connection() as conn:
        row = conn.execute('SELECT s3_key,title FROM documents WHERE id=%s AND tenant_id=%s',
                           (document_id, p.tenant)).fetchone()
    if not row:
        raise HTTPException(404, 'Document not found')
    try:
        delete_document_vectors(p.tenant, str(document_id))
    except Exception as exc:
        log.exception('Vector cleanup failed for document %s', document_id)
        raise HTTPException(502, 'Could not remove document embeddings; deletion aborted.') from exc
    try:
        client('s3').delete_object(Bucket=settings().s3_bucket, Key=row['s3_key'])
    except Exception:
        log.exception('S3 cleanup failed for document %s', document_id)
    with connection() as conn:
        deleted = conn.execute('DELETE FROM documents WHERE id=%s AND tenant_id=%s RETURNING id',
                               (document_id, p.tenant)).fetchone()
        if not deleted:
            raise HTTPException(404, 'Document not found')
        audit(conn, p.subject, p.tenant, 'document_deleted', {'document_id': str(document_id), 'title': row['title']})
    return {'deleted': True, 'document_id': str(document_id)}
