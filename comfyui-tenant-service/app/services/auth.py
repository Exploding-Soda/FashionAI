from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from ..models.database import User, Tenant
from .config import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
settings = get_settings()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt

def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

def authenticate_user(db, username: str, password: str):
    """认证用户，支持数据库和JSON存储模式"""
    from .config import get_settings
    settings = get_settings()
    
    if settings.is_database_storage():
        # 数据库存储模式
        user = db.query(User).filter(User.username == username).first()
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user
    else:
        # JSON存储模式
        user = db.get_user_by_username(username)
        if not user:
            return None
        if not verify_password(password, user["hashed_password"]):
            return None
        return user

def get_tenant_by_api_key(db, api_key: str):
    """根据API密钥获取租户，支持数据库和JSON存储模式"""
    from .config import get_settings
    settings = get_settings()
    
    if settings.is_database_storage():
        # 数据库存储模式
        return db.query(Tenant).filter(Tenant.api_key == api_key, Tenant.is_active == True).first()
    else:
        # JSON存储模式
        return db.get_tenant_by_api_key(api_key)
