import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.core.principal import Principal
from app.deps import admin_principal, current_principal
from app.services import documents as document_service

router = APIRouter(prefix='/api/documents', tags=['documents'])


class Upload(BaseModel):
    filename: str = Field(min_length=1, max_length=180)


class CompleteUpload(BaseModel):
    document_id: uuid.UUID


@router.post('/uploads')
def create_upload(body: Upload, p: Principal = Depends(current_principal)):
    return document_service.create_upload(p, body.filename)


@router.post('/complete')
def complete_upload(body: CompleteUpload, p: Principal = Depends(current_principal)):
    return document_service.complete_upload(p, body.document_id)


@router.get('')
def documents(p: Principal = Depends(current_principal)):
    return document_service.list_documents(p)


@router.delete('/{document_id}')
def delete_document(document_id: uuid.UUID, p: Principal = Depends(admin_principal)):
    return document_service.delete_document(p, document_id)
