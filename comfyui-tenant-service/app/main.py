from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import auth, tenants, proxy
from .services.logger import get_main_logger
from .services.database_init import init_database
from .services.config import get_settings

def create_app() -> FastAPI:
    logger = get_main_logger()
    settings = get_settings()
    
    logger.info("启动多租户微服务")
    
    # 显示存储配置信息
    storage_info = settings.get_storage_info()
    logger.info(f"存储配置: {storage_info['type']}")
    if storage_info['type'] == 'JSON':
        logger.info(f"JSON 存储路径: {storage_info['path']}")
    elif storage_info['type'] == 'MySQL':
        logger.info(f"MySQL 连接: {storage_info['user']}@{storage_info['host']}:{storage_info['port']}/{storage_info['database']}")
    elif storage_info['type'] == 'SQLite':
        logger.info(f"SQLite 文件: {storage_info['path']}")
    
    # Initialize database
    logger.info("初始化数据库...")
    if init_database():
        logger.info("数据库初始化成功")
    else:
        logger.warning("数据库初始化失败，使用 JSON 存储")
    
    app = FastAPI(
        title="ComfyUI Tenant Service",
        version="0.1.0",
        description="Multi-tenant microservice for ComfyUI Runninghub"
    )

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include routers
    app.include_router(auth.router, prefix="/auth", tags=["authentication"])
    app.include_router(tenants.router, prefix="/tenants", tags=["tenants"])
    app.include_router(proxy.router, prefix="/proxy", tags=["proxy"])
    
    logger.info("多租户微服务配置完成")
    return app

app = create_app()
