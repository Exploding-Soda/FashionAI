from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.sql import func
from datetime import datetime
from ..services.config import get_settings
from ..services.database_init import init_database
from ..services.logger import get_main_logger

# Initialize database
settings = get_settings()
logger = get_main_logger()

# Initialize database based on configuration
if not init_database():
    logger.warning("Database initialization failed, using JSON storage")

# Database configuration based on storage type
if settings.is_json_storage():
    # Use JSON storage, no SQLAlchemy needed
    engine = None
    SessionLocal = None
    Base = None
    logger.info(f"使用 JSON 存储: {settings.json_storage_path}")
else:
    # Use SQLAlchemy for database storage
    database_url = settings.get_database_url()
    engine = create_engine(
        database_url, 
        connect_args={"check_same_thread": False} if "sqlite" in database_url else {}
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base = declarative_base()
    
    storage_info = settings.get_storage_info()
    logger.info(f"使用 {storage_info['type']} 数据库存储")

# Define models only if using SQLAlchemy
if Base is not None:
    class Tenant(Base):
        __tablename__ = "tenants"
        
        id = Column(Integer, primary_key=True, index=True)
        name = Column(String(100), unique=True, index=True)
        api_key = Column(String(255), unique=True, index=True)
        is_active = Column(Boolean, default=True)
        created_at = Column(DateTime, default=datetime.utcnow)
        updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
        settings = Column(Text)  # JSON string for tenant-specific settings

    class User(Base):
        __tablename__ = "users"
        
        id = Column(Integer, primary_key=True, index=True)
        username = Column(String(50), unique=True, index=True)
        email = Column(String(100), unique=True, index=True, nullable=True)
        hashed_password = Column(String(255))
        tenant_id = Column(Integer, index=True)
        is_active = Column(Boolean, default=True)
        created_at = Column(DateTime, default=datetime.utcnow)
        last_login = Column(DateTime)

    class APIUsage(Base):
        __tablename__ = "api_usage"
        
        id = Column(Integer, primary_key=True, index=True)
        tenant_id = Column(Integer, index=True)
        user_id = Column(Integer, index=True)
        endpoint = Column(String(100))
        request_count = Column(Integer, default=1)
        created_at = Column(DateTime, default=datetime.utcnow)
    
    class TenantTaskRecord(Base):
        __tablename__ = "tenant_task_records"
        
        id = Column(Integer, primary_key=True, index=True)
        tenant_task_id = Column(String(100), unique=True, index=True, nullable=False)
        user_id = Column(String(100), nullable=False, index=True)
        runninghub_task_id = Column(String(100), nullable=False, index=True)
        task_type = Column(String(50), nullable=True, index=True)  # 任务类型：如 "targeted_redesign", "image_edit" 等
        created_at = Column(DateTime(timezone=True), server_default=func.now())
        completed_at = Column(DateTime(timezone=True), nullable=True)
        status = Column(String(50), nullable=False, default="PENDING")
        result_data = Column(Text, nullable=True)
        storage_paths = Column(Text, nullable=True)
        error_message = Column(Text, nullable=True)
    

    # Create tables
    if engine is not None:
        Base.metadata.create_all(bind=engine)
else:
    # For JSON storage, create dummy classes to avoid import errors
    class Tenant:
        pass
    
    class User:
        pass
    
    class APIUsage:
        pass
    
    class TenantTaskRecord:
        pass

def get_db():
    if SessionLocal is not None:
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()
    else:
        # Return JSON storage for JSON mode
        from ..services.json_storage import JSONStorage
        yield JSONStorage()
