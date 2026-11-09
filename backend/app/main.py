from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import api_router

app = FastAPI(title='Knova', docs_url='/api/docs')

origins = [origin.strip() for origin in settings().cors_origins.split(',') if origin.strip()]
if origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=['Authorization', 'Content-Type'],
    )

app.include_router(api_router)
