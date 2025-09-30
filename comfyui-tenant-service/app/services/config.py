from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Literal, Optional

StorageType = Literal["mysql", "sqlite", "json"]


class Settings(BaseSettings):
    # JWT settings
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # Runninghub backend service
    runninghub_service_url: str = "http://localhost:8080"

    # LLM service configuration
    llm_service_url: Optional[str] = None
    llm_api_key: Optional[str] = None
    llm_default_model: str = "gpt-4.1"

    # Storage configuration (json, mysql, sqlite)
    storage_type: StorageType = "json"

    # MySQL configuration (used when storage_type == "mysql")
    mysql_host: str = "localhost"
    mysql_port: int = 3306
    mysql_user: str = "root"
    mysql_password: str = ""
    mysql_database: str = "comfyui_tenant_service"

    # SQLite configuration (used when storage_type == "sqlite")
    sqlite_path: str = "./tenant_service.db"

    # JSON storage configuration (used when storage_type == "json")
    json_storage_path: str = "./database"

    # Misc configuration
    rate_limit_per_minute: int = 60
    log_level: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=[".env", "../.env", "../../.env"],
        env_prefix="",
        case_sensitive=False,
    )

    def get_database_url(self) -> str:
        """Return the database connection URL based on the storage type."""
        if self.storage_type == "mysql":
            return (
                f"mysql+pymysql://{self.mysql_user}:{self.mysql_password}"
                f"@{self.mysql_host}:{self.mysql_port}/{self.mysql_database}"
            )
        if self.storage_type == "sqlite":
            return f"sqlite:///{self.sqlite_path}"
        return ""

    def is_database_storage(self) -> bool:
        """True when using MySQL or SQLite storage."""
        return self.storage_type in ["mysql", "sqlite"]

    def is_json_storage(self) -> bool:
        """True when using the JSON file storage backend."""
        return self.storage_type == "json"

    def get_storage_info(self) -> dict:
        """Return a dictionary describing the active storage configuration."""
        if self.storage_type == "mysql":
            return {
                "type": "MySQL",
                "host": self.mysql_host,
                "port": self.mysql_port,
                "database": self.mysql_database,
                "user": self.mysql_user,
            }
        if self.storage_type == "sqlite":
            return {
                "type": "SQLite",
                "path": self.sqlite_path,
            }
        return {
            "type": "JSON",
            "path": self.json_storage_path,
        }


def get_settings() -> Settings:
    return Settings()
