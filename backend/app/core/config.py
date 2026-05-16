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
    ldap_user_dn_template: str = ""
    ldap_user_search: str = "(sAMAccountName={username})"
    ldap_use_ssl: bool = True
    ldap_search_base: str = ""

    # JWT
    jwt_secret: str = "opl-change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_minutes: int = 60
    jwt_refresh_minutes: int = 10080  # 7 days

    # S3
    s3_endpoint_url: str = ""
    s3_bucket: str = "opl-photos"
    s3_access_key: str = ""
    s3_secret_key: str = ""
    s3_region: str = "us-east-1"

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
            "ldap_user_dn_template": "LDAP_USER_DN_TEMPLATE",
            "ldap_user_search": "LDAP_USER_SEARCH",
            "ldap_use_ssl": "LDAP_USE_SSL",
            "ldap_search_base": "LDAP_SEARCH_BASE",
            "jwt_secret": "JWT_SECRET",
            "jwt_algorithm": "JWT_ALGORITHM",
            "jwt_access_minutes": "JWT_ACCESS_MINUTES",
            "jwt_refresh_minutes": "JWT_REFRESH_MINUTES",
            "s3_endpoint_url": "S3_ENDPOINT_URL",
            "s3_bucket": "S3_BUCKET",
            "s3_access_key": "S3_ACCESS_KEY",
            "s3_secret_key": "S3_SECRET_KEY",
            "s3_region": "S3_REGION",
        }


settings = Settings()
