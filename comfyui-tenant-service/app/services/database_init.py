import os
import json
from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from .config import get_settings
from .logger import get_main_logger

def create_mysql_database():
    """Create MySQL database if it doesn't exist"""
    settings = get_settings()
    logger = get_main_logger()
    
    try:
        # Connect to MySQL server (without specifying database)
        connection_url = f"mysql+pymysql://{settings.mysql_user}:{settings.mysql_password}@{settings.mysql_host}:{settings.mysql_port}/"
        engine = create_engine(connection_url)
        
        with engine.connect() as conn:
            # Create database if it doesn't exist
            conn.execute(text(f"CREATE DATABASE IF NOT EXISTS {settings.mysql_database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"))
            logger.info(f"MySQL database '{settings.mysql_database}' created or verified")
            
        return True
    except Exception as e:
        logger.error(f"Failed to create MySQL database: {str(e)}")
        return False

def init_database():
    """Initialize database based on configuration"""
    settings = get_settings()
    logger = get_main_logger()
    
    if settings.storage_type == "mysql":
        logger.info("Initializing MySQL database...")
        if create_mysql_database():
            logger.info("MySQL database initialized successfully")
            return True
        else:
            logger.warning("MySQL initialization failed, falling back to JSON storage")
            return False
    
    elif settings.storage_type == "json":
        logger.info("Using JSON file storage")
        # Create database directory
        db_path = Path(settings.json_storage_path)
        db_path.mkdir(parents=True, exist_ok=True)
        
        # Initialize JSON files
        init_json_storage()
        return True
    
    else:  # sqlite fallback
        logger.info("Using SQLite database")
        return True

def init_json_storage():
    """Initialize JSON file storage"""
    settings = get_settings()
    db_path = Path(settings.json_storage_path)
    
    # Create initial JSON files
    tenants_file = db_path / "tenants.json"
    users_file = db_path / "users.json"
    usage_file = db_path / "api_usage.json"
    task_records_file = db_path / "task_records.json"
    
    if not tenants_file.exists():
        with open(tenants_file, 'w', encoding='utf-8') as f:
            json.dump([], f, ensure_ascii=False, indent=2)
    
    if not users_file.exists():
        with open(users_file, 'w', encoding='utf-8') as f:
            json.dump([], f, ensure_ascii=False, indent=2)
    
    if not usage_file.exists():
        with open(usage_file, 'w', encoding='utf-8') as f:
            json.dump([], f, ensure_ascii=False, indent=2)
    
    if not task_records_file.exists():
        with open(task_records_file, 'w', encoding='utf-8') as f:
            json.dump([], f, ensure_ascii=False, indent=2)
