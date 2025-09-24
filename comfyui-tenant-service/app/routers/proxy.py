from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
import httpx
from sqlalchemy.orm import Session
from ..models.database import get_db, Tenant
from ..routers.auth import get_current_user
from ..services.logger import get_proxy_logger
from ..services.config import get_settings

router = APIRouter()
settings = get_settings()

async def proxy_to_runninghub(
    request: Request,
    endpoint: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logger = get_proxy_logger()
    # 获取用户名，支持两种存储模式
    if settings.is_database_storage():
        username = current_user.username
        tenant_id = current_user.tenant_id
    else:
        username = current_user["username"]
        tenant_id = current_user["tenant_id"]
    
    logger.info(f"代理请求: {endpoint}, 用户: {username}")
    
    # Get tenant info
    if settings.is_json_storage():
        tenant = db.get_tenant_by_id(tenant_id)
    else:
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Prepare request to backend service
    backend_url = f"{settings.runninghub_service_url}/v1/{endpoint}"
    
    # Get request body
    body = await request.body()
    
    # Prepare headers (no Runninghub API key needed, backend service handles it)
    headers = {
        "Content-Type": request.headers.get("content-type", "application/json")
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.request(
                method=request.method,
                url=backend_url,
                headers=headers,
                content=body,
                timeout=30.0
            )
            
            logger.info(f"后端响应: {response.status_code}")
            
            # Return response
            return JSONResponse(
                content=response.json() if response.headers.get("content-type", "").startswith("application/json") else {"data": response.text},
                status_code=response.status_code
            )
            
    except httpx.TimeoutException:
        logger.error("请求超时")
        raise HTTPException(status_code=504, detail="Backend service timeout")
    except httpx.RequestError as e:
        logger.error(f"请求错误: {str(e)}")
        raise HTTPException(status_code=502, detail="Backend service error")

@router.post("/upload")
async def upload_file(request: Request, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    return await proxy_to_runninghub(request, "upload", current_user, db)

@router.post("/generate")
async def generate_image(request: Request, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    return await proxy_to_runninghub(request, "generate", current_user, db)

@router.get("/tasks/{task_id}")
async def get_task_status(task_id: str, request: Request, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    return await proxy_to_runninghub(request, f"tasks/{task_id}", current_user, db)

@router.get("/tasks/{task_id}/outputs")
async def get_task_outputs(task_id: str, request: Request, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    return await proxy_to_runninghub(request, f"tasks/{task_id}/outputs", current_user, db)
