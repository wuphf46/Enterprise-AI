from fastapi import APIRouter

from app.routers import admin, approvals, auth, chat, documents, feedback, health

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(documents.router)
api_router.include_router(chat.router)
api_router.include_router(feedback.router)
api_router.include_router(approvals.router)
api_router.include_router(admin.router)
api_router.include_router(health.router)
