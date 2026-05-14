from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+psycopg://opl:opl@db:5432/opl"
    frontend_url: str = "http://localhost:8000"

    @classmethod
    def environment_variable_names(cls) -> dict[str, str]:
        return {"database_url": "DATABASE_URL", "frontend_url": "FRONTEND_URL"}


settings = Settings()
