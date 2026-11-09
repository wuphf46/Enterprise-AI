from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_ROOT = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config=SettingsConfigDict(env_file=BACKEND_ROOT / '.env',extra='ignore')
    aws_region:str='us-east-1'
    aws_access_key_id:str=''
    aws_secret_access_key:str=''
    s3_bucket:str=''
    database_url:str=''  # Render PostgreSQL External Database URL
    bedrock_embed_model:str='amazon.titan-embed-text-v2:0'
    bedrock_chat_model:str='amazon.nova-lite-v1:0'
    embed_dim:int=1024
    max_upload_bytes:int=10485760
    pinecone_api_key:str=''
    pinecone_index_name:str='enterprise-ai-index'
    pinecone_cloud:str='aws'
    pinecone_region:str='us-east-1'
    pinecone_ready_timeout:int=180
    min_relevance:float=0.25
    hitl_enabled:bool=True
    memory_turns:int=6
    jwt_secret_key:str=''
    jwt_issuer:str='enterprise-ai'
    jwt_audience:str='enterprise-ai-web'
    access_token_minutes:int=15
    refresh_token_days:int=14
    auth_cookie_secure:bool=False
    cors_origins:str=''
    auth_allow_registration:bool=False


@lru_cache
def settings() -> Settings:
    return Settings()