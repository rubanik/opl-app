from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+psycopg://opl:opl@db:5432/opl"
    frontend_url: str = "http://localhost:8000"

    # LDAP
    ldap_server: str = ""
    ldap_port: int = 636
    ldap_base_dn: str = ""
    ldap_bind_dn: str = ""
    ldap_bind_password: str = ""
    ldap_user_search: str = "(sAMAccountName={username})"
    ldap_use_ssl: bool = True
    ldap_search_base: str = ""

    # JWT
    jwt_secret: str = "opl-change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_minutes: int = 60
    jwt_refresh_minutes: int = 10080  # 7 days

    @classmethod
    def environment_variable_names(cls) -> dict[str, str]:
        return {
            "database_url": "DATABASE_URL",
            "frontend_url": "FRONTEND_URL",
            "ldap_server": "LDAP_SERVER",
            "ldap_port": "LDAP_PORT",
            "ldap_base_dn": "LDAP_BASE_DN",
            "ldap_bind_dn": "LDAP_BIND_DN",
            "ldap_bind_password": "LDAP_BIND_PASSWORD",
            "ldap_user_search": "LDAP_USER_SEARCH",
            "ldap_use_ssl": "LDAP_USE_SSL",
            "ldap_search_base": "LDAP_SEARCH_BASE",
            "jwt_secret": "JWT_SECRET",
            "jwt_algorithm": "JWT_ALGORITHM",
            "jwt_access_minutes": "JWT_ACCESS_MINUTES",
            "jwt_refresh_minutes": "JWT_REFRESH_MINUTES",
        }


settings = Settings()
