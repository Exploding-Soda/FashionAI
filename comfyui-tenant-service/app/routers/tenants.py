from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..models.database import get_db, Tenant, User
from ..routers.auth import get_current_user
from ..services.logger import get_tenant_logger
from ..services.config import get_settings

router = APIRouter()

class TenantCreate(BaseModel):
    name: str
    settings: str = "{}"

class TenantResponse(BaseModel):
    id: int
    name: str
    api_key: str
    is_active: bool
    created_at: str

@router.post("/", response_model=TenantResponse)
async def create_tenant(tenant_data: TenantCreate, db = Depends(get_db)):
    logger = get_tenant_logger()
    logger.info(f"创建租户请求: {tenant_data.name}")
    
    settings = get_settings()
    
    if settings.is_json_storage():
        # Use JSON storage
        try:
            tenant = db.create_tenant(
                name=tenant_data.name,
                settings=tenant_data.settings
            )
            return TenantResponse(
                id=tenant["id"],
                name=tenant["name"],
                api_key=tenant["api_key"],
                is_active=tenant["is_active"],
                created_at=tenant["created_at"]
            )
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
    else:
        # Use SQLAlchemy
        # Check if tenant exists
        if db.query(Tenant).filter(Tenant.name == tenant_data.name).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tenant name already exists"
            )
        
        # Generate API key (in production, use secure random generation)
        import uuid
        api_key = str(uuid.uuid4())
        
        # Create tenant
        db_tenant = Tenant(
            name=tenant_data.name,
            api_key=api_key,
            settings=tenant_data.settings
        )
        db.add(db_tenant)
        db.commit()
        db.refresh(db_tenant)
        
        logger.info(f"租户创建成功: {tenant_data.name}, API Key: {api_key}")
        return TenantResponse(
            id=db_tenant.id,
            name=db_tenant.name,
            api_key=db_tenant.api_key,
            is_active=db_tenant.is_active,
            created_at=db_tenant.created_at.isoformat()
        )

@router.get("/me")
async def get_tenant_info(current_user = Depends(get_current_user), db = Depends(get_db)):
    logger = get_tenant_logger()
    settings = get_settings()
    
    # 获取用户名，支持两种存储模式
    if settings.is_database_storage():
        username = current_user.username
        tenant_id = current_user.tenant_id
    else:
        username = current_user["username"]
        tenant_id = current_user["tenant_id"]
    
    logger.info(f"获取租户信息: 用户 {username}")
    
    if settings.is_database_storage():
        # 数据库存储模式
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        return {
            "tenant_id": tenant.id,
            "tenant_name": tenant.name,
            "is_active": tenant.is_active,
            "created_at": tenant.created_at.isoformat()
        }
    else:
        # JSON存储模式
        tenant = db.get_tenant_by_id(tenant_id)
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        return {
            "tenant_id": tenant["id"],
            "tenant_name": tenant["name"],
            "is_active": tenant["is_active"],
            "created_at": tenant["created_at"]
        }
