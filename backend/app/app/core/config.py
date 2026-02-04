import json
import os
from pydantic_core.core_schema import FieldValidationInfo
from pydantic import PostgresDsn, EmailStr, AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Any
import secrets
from enum import Enum
from cryptography.fernet import Fernet


def _default_encrypt_key() -> str:
    return Fernet.generate_key().decode()


class ModeEnum(str, Enum):
    development = "development"
    production = "production"
    testing = "testing"


class Settings(BaseSettings):
    MODE: ModeEnum = ModeEnum.development
    API_VERSION: str = "v1"
    API_V1_STR: str = f"/api/{API_VERSION}"
    PROJECT_NAME: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 1  # 1 hour
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 100  # 100 days
    OPENAI_API_KEY: str | None = None
    OPENAI_MODEL: str = "gpt-3.5-turbo"
    CHAT_PROVIDER: str = "vertex"  # vertex | openai
    VERTEX_PROJECT_ID: str | None = None
    VERTEX_REGION: str | None = None
    VERTEX_MODEL: str = "gemini-1.5-flash"
    DATABASE_USER: str
    DATABASE_PASSWORD: str
    DATABASE_HOST: str
    DATABASE_PORT: int
    DATABASE_NAME: str
    REDIS_HOST: str
    REDIS_PORT: str
    DB_POOL_SIZE: int = 83
    WEB_CONCURRENCY: int = 9
    POOL_SIZE: int = max(DB_POOL_SIZE // WEB_CONCURRENCY, 5)
    ASYNC_DATABASE_URI: PostgresDsn | str = ""

    @field_validator("ASYNC_DATABASE_URI", mode="after")
    def assemble_db_connection(cls, v: str | None, info: FieldValidationInfo) -> Any:
        if isinstance(v, str):
            if v == "":
                required_keys = (
                    "DATABASE_USER",
                    "DATABASE_PASSWORD",
                    "DATABASE_HOST",
                    "DATABASE_PORT",
                    "DATABASE_NAME",
                )
                if any(info.data.get(key) in (None, "") for key in required_keys):
                    return v
                return PostgresDsn.build(
                    scheme="postgresql+asyncpg",
                    username=info.data["DATABASE_USER"],
                    password=info.data["DATABASE_PASSWORD"],
                    host=info.data["DATABASE_HOST"],
                    port=info.data["DATABASE_PORT"],
                    path=info.data["DATABASE_NAME"],
                )
        return v

    FIRST_SUPERUSER_EMAIL: EmailStr | None = None
    FIRST_SUPERUSER_PASSWORD: str | None = None

    STORAGE_BACKEND: str = "local"  # gcs | local
    GCS_BUCKET: str | None = None
    GCS_SIGNED_URL_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    LOCAL_MEDIA_PATH: str = "static/uploads"

    SECRET_KEY: str = secrets.token_urlsafe(32)
    ENCRYPT_KEY: str = _default_encrypt_key()
    BACKEND_CORS_ORIGINS: list[str] | list[AnyHttpUrl]
    BACKEND_CORS_ORIGIN_REGEX: str | None = None

    @field_validator("ENCRYPT_KEY", mode="before")
    def validate_encrypt_key(cls, v: str | None) -> str:
        if v is None:
            return _default_encrypt_key()
        if isinstance(v, bytes):
            v = v.decode()
        if not isinstance(v, str):
            raise ValueError("ENCRYPT_KEY must be a string")
        value = v.strip()
        if not value:
            return _default_encrypt_key()
        try:
            Fernet(value.encode())
        except Exception as exc:
            raise ValueError(
                "ENCRYPT_KEY must be a valid Fernet key (32 url-safe base64-encoded bytes)"
            ) from exc
        return value

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    def assemble_cors_origins(
        cls, v: str | list[str]
    ) -> list[str] | list[AnyHttpUrl]:
        if isinstance(v, str):
            if v.startswith("["):
                try:
                    parsed = json.loads(v)
                except json.JSONDecodeError:
                    return [i.strip() for i in v.split(",")]
                if isinstance(parsed, list):
                    return parsed
                raise ValueError(v)
            return [i.strip() for i in v.split(",")]
        if isinstance(v, list):
            return v
        raise ValueError(v)

    model_config = SettingsConfigDict(
        case_sensitive=True, env_file=os.path.expanduser("~/.env")
    )


settings = Settings()
