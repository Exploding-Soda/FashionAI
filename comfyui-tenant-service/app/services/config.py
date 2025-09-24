from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Literal
import os

# 支持的存储类型
StorageType = Literal["mysql", "sqlite", "json"]

class Settings(BaseSettings):
    # JWT settings
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # Runninghub backend service
    runninghub_service_url: str = "http://localhost:8080"
    
    # 存储配置 - 通过 STORAGE_TYPE 环境变量控制
    storage_type: StorageType = "json"  # 默认使用 JSON 存储，更简单
    
    # MySQL 配置 (当 storage_type = "mysql" 时使用)
    mysql_host: str = "localhost"
    mysql_port: int = 3306
    mysql_user: str = "root"
    mysql_password: str = ""
    mysql_database: str = "comfyui_tenant_service"
    
    # SQLite 配置 (当 storage_type = "sqlite" 时使用)
    sqlite_path: str = "./tenant_service.db"
    
    # JSON 存储配置 (当 storage_type = "json" 时使用)
    json_storage_path: str = "./database"
    
    # 其他配置
    rate_limit_per_minute: int = 60
    log_level: str = "INFO"
    
    model_config = SettingsConfigDict(
        env_file=[".env", "../.env", "../../.env"], 
        env_prefix="", 
        case_sensitive=False
    )
    
    def get_database_url(self) -> str:
        """根据存储类型返回数据库连接URL"""
        if self.storage_type == "mysql":
            return f"mysql+pymysql://{self.mysql_user}:{self.mysql_password}@{self.mysql_host}:{self.mysql_port}/{self.mysql_database}"
        elif self.storage_type == "sqlite":
            return f"sqlite:///{self.sqlite_path}"
        else:
            # JSON 存储不需要数据库URL
            return ""
    
    def is_database_storage(self) -> bool:
        """判断是否使用数据库存储"""
        return self.storage_type in ["mysql", "sqlite"]
    
    def is_json_storage(self) -> bool:
        """判断是否使用JSON存储"""
        return self.storage_type == "json"
    
    def get_storage_info(self) -> dict:
        """获取当前存储配置信息"""
        if self.storage_type == "mysql":
            return {
                "type": "MySQL",
                "host": self.mysql_host,
                "port": self.mysql_port,
                "database": self.mysql_database,
                "user": self.mysql_user
            }
        elif self.storage_type == "sqlite":
            return {
                "type": "SQLite",
                "path": self.sqlite_path
            }
        else:
            return {
                "type": "JSON",
                "path": self.json_storage_path
            }

def get_settings() -> Settings:
    return Settings()
