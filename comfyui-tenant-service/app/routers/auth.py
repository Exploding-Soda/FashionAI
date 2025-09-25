from datetime import timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..models.database import get_db, User
from ..services.auth import authenticate_user, create_access_token, verify_token, get_password_hash
from ..services.logger import get_auth_logger
from ..services.config import get_settings
from ..models.database import Tenant

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

async def ensure_default_tenant(db, settings):
    """确保默认租户存在"""
    try:
        if settings.is_database_storage():
            # 检查默认租户是否存在
            default_tenant = db.query(Tenant).filter(Tenant.id == 1).first()
            if not default_tenant:
                # 创建默认租户
                import uuid
                default_tenant = Tenant(
                    id=1,
                    name="Default Tenant",
                    api_key=str(uuid.uuid4()),
                    is_active=True
                )
                db.add(default_tenant)
                db.commit()
        else:
            # JSON 存储
            default_tenant = db.get_tenant_by_id(1)
            if not default_tenant:
                # 创建默认租户
                import uuid
                db.create_tenant(
                    name="Default Tenant",
                    settings="{}"
                )
        return True
    except Exception as e:
        logger = get_auth_logger()
        logger.error(f"Failed to ensure default tenant: {e}")
        return False

class UserCreate(BaseModel):
    username: str
    email: Optional[str] = None
    password: str
    tenant_id: int = 1  # 默认租户ID

class UserResponse(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    tenant_id: int
    is_active: bool

class Token(BaseModel):
    access_token: str
    token_type: str

@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate, db = Depends(get_db)):
    logger = get_auth_logger()
    settings = get_settings()
    logger.info(f"用户注册请求: {user_data.username}")
    
    # 确保默认租户存在
    if not await ensure_default_tenant(db, settings):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create default tenant"
        )
    
    # Check if user exists
    if settings.is_database_storage():
        # Database storage
        if db.query(User).filter(User.username == user_data.username).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered"
            )
        
        # Only check email if provided
        if user_data.email and db.query(User).filter(User.email == user_data.email).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create user
        hashed_password = get_password_hash(user_data.password)
        db_user = User(
            username=user_data.username,
            email=user_data.email,
            hashed_password=hashed_password,
            tenant_id=user_data.tenant_id
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        logger.info(f"用户注册成功: {user_data.username}")
        return UserResponse(
            id=db_user.id,
            username=db_user.username,
            email=db_user.email,
            tenant_id=db_user.tenant_id,
            is_active=db_user.is_active
        )
    else:
        # JSON storage
        try:
            # Check if user exists
            existing_user = db.get_user_by_username(user_data.username)
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already registered"
                )
            
            # Only check email if provided
            if user_data.email:
                existing_email = db.get_user_by_email(user_data.email)
                if existing_email:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Email already registered"
                    )
            
            # Create user
            hashed_password = get_password_hash(user_data.password)
            user = db.create_user(
                username=user_data.username,
                password_hash=hashed_password,
                tenant_id=user_data.tenant_id,
                email=user_data.email
            )
            
            logger.info(f"用户注册成功: {user_data.username}")
            return UserResponse(
                id=user["id"],
                username=user["username"],
                email=user["email"],
                tenant_id=user["tenant_id"],
                is_active=user["is_active"]
            )
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )

@router.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db = Depends(get_db)):
    logger = get_auth_logger()
    settings = get_settings()
    logger.info(f"用户登录请求: {form_data.username}")
    
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        logger.warning(f"登录失败: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    access_token_expires = timedelta(minutes=30)
    
    # Get user data based on storage type
    if settings.is_database_storage():
        access_token = create_access_token(
            data={"sub": user.username, "tenant_id": user.tenant_id},
            expires_delta=access_token_expires
        )
    else:
        access_token = create_access_token(
            data={"sub": user["username"], "tenant_id": user["tenant_id"]},
            expires_delta=access_token_expires
        )
    
    logger.info(f"用户登录成功: {form_data.username}")
    return {"access_token": access_token, "token_type": "bearer"}

async def get_current_user(token: str = Depends(oauth2_scheme), db = Depends(get_db)):
    logger = get_auth_logger()
    settings = get_settings()
    
    logger.info(f"收到认证请求，token: {token[:20]}..." if token else "No token provided")
    
    try:
        payload = verify_token(token)
        username = payload.get("sub")
        tenant_id = payload.get("tenant_id")
        logger.info(f"Token验证成功，用户: {username}, 租户: {tenant_id}")
    except Exception as e:
        logger.error(f"Token验证失败: {str(e)}")
        raise
    
    if settings.is_database_storage():
        user = db.query(User).filter(User.username == username).first()
        if not user:
            logger.warning(f"用户不存在: {username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
    else:
        user = db.get_user_by_username(username)
        if not user:
            logger.warning(f"用户不存在: {username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
    
    logger.debug(f"用户认证成功: {username}, 租户ID: {tenant_id}")
    return user

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user = Depends(get_current_user), settings = Depends(get_settings)):
    """获取当前用户信息"""
    logger = get_auth_logger()
    
    if settings.is_database_storage():
        # 数据库存储模式
        return UserResponse(
            id=current_user.id,
            username=current_user.username,
            email=current_user.email,
            tenant_id=current_user.tenant_id,
            is_active=current_user.is_active
        )
    else:
        # JSON存储模式
        return UserResponse(
            id=current_user["id"],
            username=current_user["username"],
            email=current_user["email"],
            tenant_id=current_user["tenant_id"],
            is_active=current_user["is_active"]
        )
