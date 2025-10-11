from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse, FileResponse
import httpx
from sqlalchemy.orm import Session
from pathlib import Path
from datetime import datetime
import json
from io import BytesIO
try:
    from PIL import Image
except ImportError:  # pragma: no cover - optional dependency
    Image = None
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
    
    # Get request body and headers
    body = await request.body()
    content_type = request.headers.get("content-type", "application/json")
    
    # Prepare headers
    headers = {
        "Content-Type": content_type
    }
    
    try:
        logger.info(f"准备请求后端服务: {backend_url}")
        logger.info(f"请求方法: {request.method}")
        logger.info(f"内容类型: {content_type}")
        
        # 测试连接
        try:
            async with httpx.AsyncClient(timeout=5.0) as test_client:
                # 测试基本连接
                test_response = await test_client.get(f"{settings.runninghub_service_url}/docs")
                logger.info(f"连接测试成功: {test_response.status_code}")
                
                # 测试健康检查端点
                try:
                    health_response = await test_client.get(f"{settings.runninghub_service_url}/health")
                    logger.info(f"健康检查: {health_response.status_code}")
                except Exception as health_e:
                    logger.warning(f"健康检查失败: {str(health_e)}")
                    
        except httpx.ConnectError as connect_e:
            logger.error(f"无法连接到RunningHub服务器: {str(connect_e)}")
            logger.error(f"请检查RunningHub服务器是否在 {settings.runninghub_service_url} 运行")
        except httpx.TimeoutException as timeout_e:
            logger.error(f"连接RunningHub服务器超时: {str(timeout_e)}")
        except Exception as test_e:
            logger.error(f"连接测试失败: {str(test_e)}")
            logger.error(f"错误类型: {type(test_e).__name__}")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            # For file uploads, we need to handle multipart/form-data differently
            if "multipart/form-data" in content_type:
                logger.info("处理文件上传请求")
                # Parse the multipart data and forward it
                form_data = await request.form()
                files = {}
                data = {}
                
                # 准备 httpx 的文件上传格式
                httpx_files = {}
                httpx_data = {}
                
                for key, value in form_data.items():
                    if hasattr(value, 'filename'):  # It's a file
                        file_content = await value.read()
                        # httpx 文件格式: (filename, content, content_type)
                        httpx_files[key] = (value.filename, file_content, value.content_type)
                        logger.info(f"文件: {key} = {value.filename} ({len(file_content)} bytes)")
                    else:
                        httpx_data[key] = value
                        logger.info(f"数据: {key} = {value}")
                
                logger.info(f"发送文件上传请求到: {backend_url}")
                logger.info(f"httpx_files: {list(httpx_files.keys())}")
                logger.info(f"httpx_data: {httpx_data}")
                
                response = await client.post(
                    backend_url,
                    files=httpx_files,
                    data=httpx_data,
                    timeout=30.0
                )
            else:
                logger.info("处理JSON请求")
                # For JSON requests
                response = await client.request(
                    method=request.method,
                    url=backend_url,
                    headers=headers,
                    content=body,
                    timeout=30.0
                )
            
            logger.info(f"后端响应: {response.status_code}")
            logger.info(f"后端响应头: {dict(response.headers)}")
            
            # 检查响应状态码
            if response.status_code >= 400:
                logger.error(f"后端服务返回错误状态码: {response.status_code}")
                try:
                    error_text = response.text
                    logger.error(f"后端错误响应内容: {error_text}")
                except Exception as e:
                    logger.error(f"无法读取错误响应内容: {str(e)}")
            
            # Return response
            if response.headers.get("content-type", "").startswith("application/json"):
                try:
                    response_data = response.json()
                    logger.info(f"后端响应数据: {response_data}")
                    return JSONResponse(
                        content=response_data,
                        status_code=response.status_code
                    )
                except Exception as e:
                    logger.error(f"解析JSON响应失败: {str(e)}")
                    return JSONResponse(
                        content={"error": "Failed to parse JSON response", "raw_response": response.text},
                        status_code=response.status_code
                    )
            else:
                response_text = response.text
                logger.info(f"后端响应文本: {response_text}")
                return JSONResponse(
                    content={"data": response_text},
                    status_code=response.status_code
                )
            
    except httpx.TimeoutException as e:
        logger.error(f"请求超时: {str(e)}")
        logger.error(f"超时详情: 请求URL={backend_url}, 超时时间=30秒")
        raise HTTPException(status_code=504, detail=f"Backend service timeout: {str(e)}")
    except httpx.ConnectError as e:
        logger.error(f"连接错误: {str(e)}")
        logger.error(f"连接详情: 目标URL={backend_url}, 错误类型={type(e).__name__}")
        logger.error(f"可能原因: RunningHub服务器未启动或网络不可达")
        raise HTTPException(status_code=503, detail=f"Cannot connect to backend service: {str(e)}")
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP状态错误: {e.response.status_code}")
        logger.error(f"响应头: {dict(e.response.headers)}")
        try:
            error_content = e.response.text
            logger.error(f"错误响应内容: {error_content}")
        except Exception as content_e:
            logger.error(f"无法读取错误响应内容: {str(content_e)}")
        raise HTTPException(status_code=e.response.status_code, detail=f"Backend service returned {e.response.status_code}")
    except httpx.RequestError as e:
        logger.error(f"请求错误: {str(e)}")
        logger.error(f"请求详情: URL={backend_url}, 方法={request.method}")
        raise HTTPException(status_code=502, detail=f"Backend service error: {str(e)}")
    except Exception as e:
        logger.error(f"未知错误: {str(e)}")
        logger.error(f"错误类型: {type(e).__name__}")
        logger.error(f"错误详情: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/llm/chat")
async def proxy_llm_chat(request: Request, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    logger = get_proxy_logger()

    if settings.is_database_storage():
        username = current_user.username
        tenant_id = current_user.tenant_id
    else:
        username = current_user["username"]
        tenant_id = current_user["tenant_id"]

    logger.info(f"LLM对话代理请求, 用户: {username}")

    if settings.is_json_storage():
        tenant = db.get_tenant_by_id(tenant_id)
    else:
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()

    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    raw_settings = None
    if settings.is_database_storage():
        raw_settings = getattr(tenant, "settings", None)
    else:
        raw_settings = tenant.get("settings")

    tenant_settings = {}
    if raw_settings:
        if isinstance(raw_settings, dict):
            tenant_settings = raw_settings
        elif isinstance(raw_settings, str):
            try:
                tenant_settings = json.loads(raw_settings)
            except json.JSONDecodeError:
                logger.warning("无法解析租户的settings字段，使用默认LLM配置")

    tenant_settings = tenant_settings if isinstance(tenant_settings, dict) else {}
    llm_nested = tenant_settings.get("llm") if isinstance(tenant_settings.get("llm"), dict) else {}

    llm_service_url = (
        llm_nested.get("service_url")
        or llm_nested.get("endpoint")
        or tenant_settings.get("llm_service_url")
        or tenant_settings.get("llm_endpoint")
        or settings.llm_service_url
    )
    llm_api_key = (
        llm_nested.get("api_key")
        or tenant_settings.get("llm_api_key")
        or settings.llm_api_key
    )
    llm_default_model = (
        llm_nested.get("default_model")
        or llm_nested.get("model")
        or tenant_settings.get("llm_default_model")
        or settings.llm_default_model
        or "gpt-4.1"
    )

    if not llm_service_url or not llm_api_key:
        logger.error("LLM服务未配置")
        raise HTTPException(status_code=500, detail="LLM service is not configured")

    target_url = f"{llm_service_url.rstrip('/')}/chat/completions"

    try:
        payload = await request.json()
    except Exception as exc:
        logger.error(f"解析请求JSON失败: {exc}")
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

@router.post("/llm/palette_from_image")
async def palette_from_image(request: Request, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    接收前端上传的图片与提示词，转发至租户配置的LLM视觉端点，要求返回RGB配色组。
    返回格式：{ "groups": [ { "colors": [ {r,g,b}, ... ] }, ... ] }
    """
    logger = get_proxy_logger()

    # 读取租户LLM配置
    if settings.is_database_storage():
        username = current_user.username
        tenant_id = current_user.tenant_id
    else:
        username = current_user["username"]
        tenant_id = current_user["tenant_id"]

    if settings.is_json_storage():
        tenant = db.get_tenant_by_id(tenant_id)
    else:
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    raw_settings = getattr(tenant, "settings", None) if settings.is_database_storage() else tenant.get("settings")
    tenant_settings = {}
    if raw_settings:
        if isinstance(raw_settings, dict):
            tenant_settings = raw_settings
        elif isinstance(raw_settings, str):
            try:
                tenant_settings = json.loads(raw_settings)
            except json.JSONDecodeError:
                tenant_settings = {}

    llm_nested = tenant_settings.get("llm") if isinstance(tenant_settings.get("llm"), dict) else {}
    llm_service_url = (
        llm_nested.get("service_url")
        or llm_nested.get("endpoint")
        or tenant_settings.get("llm_service_url")
        or tenant_settings.get("llm_endpoint")
        or settings.llm_service_url
    )
    llm_api_key = (
        llm_nested.get("api_key")
        or tenant_settings.get("llm_api_key")
        or settings.llm_api_key
    )
    llm_vision_path = llm_nested.get("vision_path") or "/chat/completions"

    if not llm_service_url or not llm_api_key:
        raise HTTPException(status_code=500, detail="LLM service is not configured")

    # 读取表单：文件+提示词
    form = await request.form()
    file = form.get("file")
    prompt = form.get("prompt") or "请返回RGB配色组的JSON。"
    if not hasattr(file, 'filename'):
        raise HTTPException(status_code=400, detail="file is required")

    file_bytes = await file.read()
    original_size = len(file_bytes)
    compressed_mime = None

    # 如果图片过大（>1MB），尝试压缩到 512KB 以下再发送给 LLM
    if original_size > 1024 * 1024:
        if Image is None:
            logger.warning("palette_from_image: Pillow not installed, cannot compress large image (size=%d bytes)", original_size)
        else:
            try:
                image = Image.open(BytesIO(file_bytes))
                image = image.convert("RGB")

                target_size = 512 * 1024
                quality = 95
                buffer = BytesIO()

                def save_image(img, q):
                    buffer.seek(0)
                    buffer.truncate(0)
                    img.save(buffer, format="JPEG", quality=q, optimize=True)

                working_image = image
                save_image(working_image, quality)

                while buffer.tell() > target_size and quality > 10:
                    quality -= 5
                    save_image(working_image, quality)

                if buffer.tell() > target_size:
                    # 继续压缩：逐步缩小尺寸
                    min_side = 128
                    while buffer.tell() > target_size and (working_image.width > min_side or working_image.height > min_side):
                        new_width = max(min_side, int(working_image.width * 0.9))
                        new_height = max(min_side, int(working_image.height * 0.9))
                        if new_width == working_image.width and new_height == working_image.height:
                            break
                        resample = Image.LANCZOS if hasattr(Image, "LANCZOS") else Image.BICUBIC
                        working_image = working_image.resize((new_width, new_height), resample)
                        save_image(working_image, max(quality, 40))

                compressed_bytes = buffer.getvalue()
                if len(compressed_bytes) < original_size and len(compressed_bytes) <= target_size:
                    logger.info(
                        "palette_from_image: compressed image from %d bytes to %d bytes (quality=%d)",
                        original_size,
                        len(compressed_bytes),
                        quality,
                    )
                    file_bytes = compressed_bytes
                    compressed_mime = "image/jpeg"
                else:
                    logger.info("palette_from_image: compression did not reach target size (original=%d, result=%d)", original_size, len(compressed_bytes))
            except Exception as comp_err:
                logger.warning(f"palette_from_image: image compression failed: {comp_err}")

    # 参考 llm-request-example.html：使用 data URL 的 image_url 方式
    import base64
    import mimetypes
    mime, _ = mimetypes.guess_type(file.filename)
    if compressed_mime:
        mime = compressed_mime
    else:
        mime = mime or "image/png"
    b64 = base64.b64encode(file_bytes).decode("ascii")
    data_url = f"data:{mime};base64,{b64}"

    payload = {
        "model": (llm_nested.get("default_model") or llm_nested.get("model") or tenant_settings.get("llm_default_model") or settings.llm_default_model or "gpt-4.1"),
        "messages": [
            {"role": "system", "content": "你是服装配色顾问，只输出JSON，无多余文字。"},
            {"role": "user", "content": [
                {"type": "text", "text": str(prompt)},
                {"type": "image_url", "image_url": {"url": data_url}}
            ]}
        ],
        "response_format": {"type": "json_object"},
        "stream": False
    }

    target_url = f"{llm_service_url.rstrip('/')}{llm_vision_path}"

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                target_url,
                headers={
                    "Authorization": f"Bearer {llm_api_key}",
                    "Content-Type": "application/json"
                },
                json=payload
            )
            text = resp.text
            # 兼容不同LLM响应结构，尽力提取JSON
            data = None
            try:
                data = resp.json()
            except Exception:
                pass
            # 常见OpenAI样式
            if isinstance(data, dict):
                content = None
                try:
                    content = data.get("choices", [{}])[0].get("message", {}).get("content")
                except Exception:
                    content = None
                if isinstance(content, str):
                    try:
                        return JSONResponse(content=json.loads(content))
                    except Exception:
                        return JSONResponse(content={"groups": []})
            # 回退：直接尝试将文本解析为JSON
            try:
                return JSONResponse(content=json.loads(text))
            except Exception:
                return JSONResponse(content={"groups": []})
    except Exception as e:
        logger.error(f"palette_from_image 调用失败: {e}")
        raise HTTPException(status_code=500, detail="Palette generation failed")

    if not payload.get("model"):
        payload["model"] = llm_default_model

    headers = {
        "Authorization": f"Bearer {llm_api_key}",
        "Content-Type": "application/json"
    }

    logger.info(f"转发LLM请求到: {target_url}")

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(target_url, json=payload, headers=headers)
    except httpx.TimeoutException as exc:
        logger.error(f"LLM服务请求超时: {exc}")
        raise HTTPException(status_code=504, detail="LLM service timeout")
    except httpx.HTTPError as exc:
        logger.error(f"LLM服务请求错误: {exc}")
        raise HTTPException(status_code=502, detail="LLM service request failed")

    logger.info(f"LLM响应状态码: {response.status_code}")

    if response.status_code >= 400:
        try:
            error_payload = response.json()
        except Exception:
            error_payload = {"detail": response.text}
        logger.error(f"LLM服务返回错误: {error_payload}")
        return JSONResponse(content=error_payload, status_code=response.status_code)

    try:
        data = response.json()
    except ValueError:
        logger.error("LLM响应非JSON格式")
        return JSONResponse(
            content={"error": "Invalid response from LLM service", "raw_response": response.text},
            status_code=response.status_code
        )

    return JSONResponse(content=data, status_code=response.status_code)


@router.post("/llm/stripe_variations")
async def stripe_variations(request: Request, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    根据前端传来的条纹RGB与宽度信息，向租户配置的LLM请求风格衍生方案。
    预期返回：{ "variations": [ { "title": "", "styleNote": "", "stripeUnits": [ { "color": {...}, "relativeWidth": 0.0 } ] }, ... ], "guidance": "" }
    """
    logger = get_proxy_logger()

    if settings.is_database_storage():
        username = current_user.username
        tenant_id = current_user.tenant_id
    else:
        username = current_user["username"]
        tenant_id = current_user["tenant_id"]

    logger.info(f"LLM条纹衍生请求, 用户: {username}")

    if settings.is_json_storage():
        tenant = db.get_tenant_by_id(tenant_id)
    else:
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    raw_settings = getattr(tenant, "settings", None) if settings.is_database_storage() else tenant.get("settings")
    tenant_settings = {}
    if raw_settings:
        if isinstance(raw_settings, dict):
            tenant_settings = raw_settings
        elif isinstance(raw_settings, str):
            try:
                tenant_settings = json.loads(raw_settings)
            except json.JSONDecodeError:
                tenant_settings = {}

    llm_nested = tenant_settings.get("llm") if isinstance(tenant_settings.get("llm"), dict) else {}
    llm_service_url = (
        llm_nested.get("service_url")
        or llm_nested.get("endpoint")
        or tenant_settings.get("llm_service_url")
        or tenant_settings.get("llm_endpoint")
        or settings.llm_service_url
    )
    llm_api_key = (
        llm_nested.get("api_key")
        or tenant_settings.get("llm_api_key")
        or settings.llm_api_key
    )
    llm_default_model = (
        llm_nested.get("default_model")
        or llm_nested.get("model")
        or tenant_settings.get("llm_default_model")
        or settings.llm_default_model
        or "gpt-4.1"
    )

    if not llm_service_url or not llm_api_key:
        raise HTTPException(status_code=500, detail="LLM service is not configured")

    try:
        body = await request.json()
    except Exception as exc:
        logger.error(f"解析条纹衍生请求JSON失败: {exc}")
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    stripe_units = body.get("stripeUnits") or []
    palette_groups = body.get("paletteGroups") or []
    target_count = body.get("targetCount") or 4

    if not isinstance(stripe_units, list) or len(stripe_units) == 0:
        raise HTTPException(status_code=400, detail="stripeUnits are required")

    def safe_round_width(value: float) -> float:
        try:
            return round(float(value), 2)
        except Exception:
            return 0.0

    normalized_units = []
    for unit in stripe_units:
        if not isinstance(unit, dict):
            continue
        color = unit.get("color") or {}
        width_px = unit.get("widthPx", 0)
        try:
            r = int(color.get("r", 0))
            g = int(color.get("g", 0))
            b = int(color.get("b", 0))
        except Exception:
            r = g = b = 0
        try:
            width_px = max(1, float(width_px))
        except Exception:
            width_px = 1.0
        normalized_units.append({
            "color": {"r": max(0, min(255, r)), "g": max(0, min(255, g)), "b": max(0, min(255, b))},
            "widthPx": safe_round_width(width_px),
        })

    if not normalized_units:
        raise HTTPException(status_code=400, detail="No valid stripe units provided")

    units_json = json.dumps(normalized_units, ensure_ascii=False)
    palette_json = json.dumps(palette_groups, ensure_ascii=False) if palette_groups else "[]"

    prompt = (
        "我们已经提取了一组条纹印花的最小循环单元，包含RGB颜色与相对宽度数据。"
        "请作为资深纺织图案设计师，基于这些信息构思新的艺术化条纹方案。你可以增减色带数量、调整颜色或宽度，"
        "但需要保持色彩协调、适合服装印花的风格，并确保每个方案的相对宽度可归一化。"
        "\n\n原始条纹单元（widthPx 为相对像素宽度）：\n"
        f"{units_json}\n"
        "\n如果有帮助，可参考这些协调配色组（可选）：\n"
        f"{palette_json}\n"
        "\n请输出一个JSON对象，格式如下：\n"
        '{ "variations": [ { "title": "方案名称", "styleNote": "风格说明", "stripeUnits": [ { "color": {"r":0-255,"g":0-255,"b":0-255}, "relativeWidth": 0.00 }, ... ] }, ... ], "guidance": "整体建议" }\n'
        "要求：\n"
        f"1. 给出 {target_count} 个左右的方案（如果灵感有限可少于此数，但至少2个）。\n"
        "2. 每个方案的 stripeUnits 至少包含 3 条色带，relativeWidth 为 0-1 的小数，并保证总和≈1（允许两位小数误差）。\n"
        "3. 可以引入新的颜色或调换顺序，但要与原始风格有联系。\n"
        "4. 仅返回JSON，不要加入额外解释或Markdown。\n"
    )

    payload = {
        "model": llm_default_model,
        "messages": [
            {"role": "system", "content": "你是资深纺织与印花设计师，只能输出JSON对象，不得添加多余文字。"},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.8,
        "response_format": {"type": "json_object"},
        "stream": False,
    }

    target_url = f"{llm_service_url.rstrip('/')}/chat/completions"

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                target_url,
                headers={
                    "Authorization": f"Bearer {llm_api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
    except httpx.TimeoutException as exc:
        logger.error(f"LLM条纹衍生请求超时: {exc}")
        raise HTTPException(status_code=504, detail="LLM service timeout")
    except httpx.HTTPError as exc:
        logger.error(f"LLM条纹衍生请求失败: {exc}")
        raise HTTPException(status_code=502, detail="LLM service request failed")

    text = resp.text
    data = None
    try:
        data = resp.json()
    except Exception:
        data = None

    if resp.status_code >= 400:
        logger.error(f"LLM条纹衍生服务错误: {text}")
        if isinstance(data, dict):
            raise HTTPException(status_code=resp.status_code, detail=data)
        raise HTTPException(status_code=resp.status_code, detail=text or "LLM service error")

    if isinstance(data, dict):
        content = None
        try:
            content = data.get("choices", [{}])[0].get("message", {}).get("content")
        except Exception:
            content = None
        if isinstance(content, str):
            try:
                return JSONResponse(content=json.loads(content))
            except Exception as parse_err:
                logger.warning(f"解析LLM条纹内容失败，返回原始 choices: {parse_err}")
                return JSONResponse(content={"variations": []})

    try:
        parsed = json.loads(text)
        return JSONResponse(content=parsed)
    except Exception:
        logger.warning("LLM条纹衍生响应非JSON，返回空结果")
        return JSONResponse(content={"variations": []})

@router.post("/upload")
async def upload_file(request: Request, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    return await proxy_to_runninghub(request, "upload", current_user, db)

@router.post("/generate")
async def generate_image(request: Request, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    return await proxy_to_runninghub(request, "generate", current_user, db)

@router.get("/tasks/history")
async def get_task_history(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    page: int = 1,
    limit: int = 20,
    task_type: str | None = None,
):
    """
    获取用户的任务历史记录
    """
    from ..services.task_record_service import task_record_service
    
    logger = get_proxy_logger()
    
    try:
        # 获取用户名
        if settings.is_database_storage():
            username = current_user.username
        else:
            username = current_user["username"]
        
        logger.info(f"获取用户任务历史: {username}, 页码: {page}, 限制: {limit}")
        
        # 计算偏移量
        offset = (page - 1) * limit
        
        # 获取用户任务记录
        task_records = task_record_service.get_user_tasks(username, limit, db, offset)

        # 可选：按任务类型筛选
        if task_type:
            try:
                task_records = [r for r in task_records if (r.get("task_type") == task_type)]
            except Exception:
                pass
        
        # 处理任务记录，添加图片URL
        history_items = []
        for record in task_records:
            # 构建图片URL
            image_urls = []
            if record.get("storage_paths"):
                storage_paths = record["storage_paths"]
                if isinstance(storage_paths, str):
                    # 如果是字符串，尝试解析为列表
                    import json
                    try:
                        storage_paths = json.loads(storage_paths)
                    except:
                        storage_paths = [storage_paths]
                
                for path in storage_paths:
                    if path:
                        # 将存储路径转换为可访问的URL
                        import re
                        relative_path = re.sub(r'^output[\\\/]', '', path)
                        # 返回相对路径，让前端通过Next.js API路由代理请求
                        # 先处理路径分隔符，避免在f-string中使用反斜杠
                        normalized_path = relative_path.replace('\\', '/')
                        image_url = f"/api/proxy/static/images/{normalized_path}"
                        image_urls.append(image_url)
            
            history_item = {
                "id": record.get("id"),
                "tenant_task_id": record.get("tenant_task_id"),
                "user_id": record.get("user_id"),
                "runninghub_task_id": record.get("runninghub_task_id"),
                "task_type": record.get("task_type"),
                "status": record.get("status"),
                "created_at": record.get("created_at"),
                "completed_at": record.get("completed_at"),
                "result_data": record.get("result_data"),
                "storage_paths": record.get("storage_paths"),
                "image_urls": image_urls,
                "error_message": record.get("error_message")
            }
            history_items.append(history_item)
        
        logger.info(f"返回 {len(history_items)} 条历史记录")
        return history_items
        
    except Exception as e:
        logger.error(f"获取任务历史失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取任务历史失败: {str(e)}")

@router.get("/tasks/{task_id}")
async def get_task_status(task_id: str, request: Request, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    return await proxy_to_runninghub(request, f"tasks/{task_id}", current_user, db)

@router.get("/tasks/{task_id}/outputs")
async def get_task_outputs(task_id: str, request: Request, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    return await proxy_to_runninghub(request, f"tasks/{task_id}/outputs", current_user, db)

@router.get("/tasks/{task_id}/outputs/stored")
async def get_stored_task_outputs(
    task_id: str, 
    current_user = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """
    获取已存储的任务输出
    下载并存储图片到本地，返回本地路径
    """
    from ..services.image_storage import image_storage_service
    from ..services.task_record_service import task_record_service
    import httpx
    
    logger = get_proxy_logger()
    
    try:
        # 获取用户名
        if settings.is_database_storage():
            username = current_user.username
        else:
            username = current_user["username"]
        
        logger.info(f"获取存储的任务输出: {task_id}, 用户: {username}")
        
        # 首先从RunningHub获取原始输出
        backend_url = f"{settings.runninghub_service_url}/v1/tasks/{task_id}/outputs"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(backend_url)
            response.raise_for_status()
            outputs_data = response.json()
        
        logger.info(f"从RunningHub获取到输出: {outputs_data}")
        
        # 下载并存储图片
        if "outputs" in outputs_data and outputs_data["outputs"]:
            stored_outputs = await image_storage_service.download_and_store_images(
                username, 
                outputs_data["outputs"]
            )
            
            # 提取存储路径
            storage_paths = []
            for output in stored_outputs:
                if "localPath" in output:
                    storage_paths.append(output["localPath"])
            
            # 更新任务记录（如果存在）
            # 这里需要根据task_id查找对应的tenant_task_id
            # 暂时跳过，因为我们需要在创建任务时记录tenant_task_id
            
            # 返回处理后的输出
            return {
                "taskId": task_id,
                "outputs": stored_outputs,
                "storagePaths": storage_paths,
                "message": "图片已下载并存储到本地"
            }
        else:
            return outputs_data
            
    except Exception as e:
        logger.error(f"获取存储的任务输出失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取任务输出失败: {str(e)}")

@router.post("/generate/image_edit")
async def generate_image_edit(request: Request, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    return await proxy_to_runninghub(request, "generate/image_edit", current_user, db)

@router.post("/complete_image_edit")
async def complete_image_edit(request: Request, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    完整的图片编辑工作流
    创建任务记录并代理到RunningHub
    """
    from ..services.task_record_service import task_record_service
    import httpx
    
    logger = get_proxy_logger()
    
    try:
        # 获取用户名
        if settings.is_database_storage():
            username = current_user.username
        else:
            username = current_user["username"]
        
        logger.info(f"开始完整图片编辑工作流: 用户={username}")
        
        # 代理到RunningHub
        result = await proxy_to_runninghub(request, "complete_image_edit", current_user, db)
        
        # 检查返回结果类型
        if isinstance(result, JSONResponse):
            # 如果是JSONResponse，提取内容
            response_data = result.body
            if isinstance(response_data, bytes):
                import json
                response_data = json.loads(response_data.decode('utf-8'))
            
            # 如果任务创建成功，记录tenant任务
            if isinstance(response_data, dict) and "taskId" in response_data:
                runninghub_task_id = response_data["taskId"]
                tenant_task_id = task_record_service.create_task_record(
                    username, 
                    runninghub_task_id, 
                    db,
                    task_type="targeted_redesign"  # 标记为Targeted Redesign任务
                )
                
                # 在结果中添加tenant_task_id
                response_data["tenantTaskId"] = tenant_task_id
                logger.info(f"创建tenant任务记录: {tenant_task_id}")
                
                # 返回更新后的响应
                return JSONResponse(
                    content=response_data,
                    status_code=result.status_code
                )
        
        return result
        
    except Exception as e:
        logger.error(f"完整图片编辑工作流失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"图片编辑失败: {str(e)}")

@router.post("/complete_pattern_extract")
async def complete_pattern_extract(request: Request, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    完整印花提取工作流：创建任务记录并代理到RunningHub
    """
    from ..services.task_record_service import task_record_service
    import httpx

    logger = get_proxy_logger()

    try:
        # 获取用户名
        if settings.is_database_storage():
            username = current_user.username
        else:
            username = current_user["username"]

        logger.info(f"开始完整印花提取工作流: 用户={username}")

        # 代理到RunningHub
        result = await proxy_to_runninghub(request, "complete_pattern_extract", current_user, db)

        # 处理返回
        if isinstance(result, JSONResponse):
            response_data = result.body
            if isinstance(response_data, bytes):
                import json
                response_data = json.loads(response_data.decode('utf-8'))

            if isinstance(response_data, dict) and "taskId" in response_data:
                runninghub_task_id = response_data["taskId"]
                tenant_task_id = task_record_service.create_task_record(
                    username,
                    runninghub_task_id,
                    db,
                    task_type="pattern_extract"
                )

                response_data["tenantTaskId"] = tenant_task_id
                logger.info(f"创建tenant任务记录(印花提取): {tenant_task_id}")

                return JSONResponse(content=response_data, status_code=result.status_code)

        return result

    except Exception as e:
        logger.error(f"完整印花提取工作流失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"印花提取失败: {str(e)}")

@router.post("/variant_overlay")
async def variant_overlay(
    request: Request,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Variant overlay 工作流：代理到 RunningHub
    """
    logger = get_proxy_logger()
    try:
        result = await proxy_to_runninghub(request, "variant_overlay", current_user, db)
        return result
    except Exception as e:
        logger.error(f"Variant overlay 工作流失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Variant overlay 失败: {str(e)}")

@router.post("/tasks/{task_id}/complete")
async def complete_task_with_storage(
    task_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    任务完成处理：自动下载图片并更新任务记录
    """
    from ..services.task_record_service import task_record_service
    from ..services.image_storage import image_storage_service
    import httpx
    
    logger = get_proxy_logger()
    
    try:
        # 获取用户名
        if settings.is_database_storage():
            username = current_user.username
        else:
            username = current_user["username"]
        
        logger.info(f"开始处理任务完成: {task_id}, 用户: {username}")
        
        # 1. 从RunningHub获取任务输出
        async with httpx.AsyncClient(timeout=30.0) as client:
            outputs_response = await client.get(f"{settings.runninghub_service_url}/v1/tasks/{task_id}/outputs")
            outputs_response.raise_for_status()
            outputs_data = outputs_response.json()
        
        logger.info(f"获取到任务输出: {outputs_data}")
        
        # 2. 下载并存储图片
        if "outputs" in outputs_data and outputs_data["outputs"]:
            stored_outputs = await image_storage_service.download_and_store_images(
                username, 
                outputs_data["outputs"]
            )
            
            # 提取存储路径
            storage_paths = []
            for output in stored_outputs:
                if "localPath" in output:
                    storage_paths.append(output["localPath"])
            
            logger.info(f"图片存储完成，路径: {storage_paths}")
            
            # 3. 更新任务记录
            # 首先找到对应的tenant任务记录
            task_records = db.get_user_tasks(username, limit=100) if hasattr(db, 'get_user_tasks') else []
            tenant_task_id = None
            
            for record in task_records:
                if record.get("runninghub_task_id") == task_id:
                    tenant_task_id = record.get("tenant_task_id")
                    break
            
            if tenant_task_id:
                # 更新任务为成功状态
                success = task_record_service.update_task_success(
                    tenant_task_id,
                    outputs_data,
                    storage_paths,
                    db
                )
                
                if success:
                    logger.info(f"任务记录更新成功: {tenant_task_id}")
                else:
                    logger.error(f"任务记录更新失败: {tenant_task_id}")
            
            # 4. 返回处理结果（不包含fileUrl）
            result = {
                "taskId": task_id,
                "status": "completed",
                "message": "图片已下载并存储到本地",
                "storagePaths": storage_paths,
                "outputCount": len(stored_outputs)
            }
            
            return result
        else:
            logger.warning(f"任务 {task_id} 没有输出")
            return {
                "taskId": task_id,
                "status": "completed",
                "message": "任务完成，但没有输出文件",
                "outputCount": 0
            }
            
    except Exception as e:
        logger.error(f"处理任务完成失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"任务完成处理失败: {str(e)}")

@router.get("/diagnostics/runninghub")
async def diagnose_runninghub():
    """
    诊断RunningHub服务器状态
    """
    logger = get_proxy_logger()
    settings = get_settings()
    
    diagnostics = {
        "runninghub_url": settings.runninghub_service_url,
        "timestamp": datetime.now().isoformat(),
        "tests": {}
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # 测试基本连接
            try:
                response = await client.get(f"{settings.runninghub_service_url}/docs")
                diagnostics["tests"]["docs_endpoint"] = {
                    "status": "success",
                    "status_code": response.status_code,
                    "response_time": "N/A"
                }
            except Exception as e:
                diagnostics["tests"]["docs_endpoint"] = {
                    "status": "failed",
                    "error": str(e),
                    "error_type": type(e).__name__
                }
            
            # 测试健康检查
            try:
                response = await client.get(f"{settings.runninghub_service_url}/health")
                diagnostics["tests"]["health_endpoint"] = {
                    "status": "success",
                    "status_code": response.status_code,
                    "response_time": "N/A"
                }
            except Exception as e:
                diagnostics["tests"]["health_endpoint"] = {
                    "status": "failed",
                    "error": str(e),
                    "error_type": type(e).__name__
                }
            
            # 测试API端点
            try:
                response = await client.get(f"{settings.runninghub_service_url}/v1/")
                diagnostics["tests"]["api_endpoint"] = {
                    "status": "success",
                    "status_code": response.status_code,
                    "response_time": "N/A"
                }
            except Exception as e:
                diagnostics["tests"]["api_endpoint"] = {
                    "status": "failed",
                    "error": str(e),
                    "error_type": type(e).__name__
                }
    
    except Exception as e:
        diagnostics["error"] = str(e)
        logger.error(f"诊断失败: {str(e)}")
    
    return diagnostics

@router.get("/static/images/{file_path:path}")
async def serve_stored_image(file_path: str):
    """
    提供存储的图片文件
    """
    logger = get_proxy_logger()
    
    try:
        # 获取项目根目录（comfyui-tenant-service目录）
        import os
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        output_dir = Path(project_root) / "output"
        full_path = output_dir / file_path
        
        logger.info(f"请求图片文件: {file_path}")
        logger.info(f"项目根目录: {project_root}")
        logger.info(f"output目录: {output_dir}")
        logger.info(f"完整路径: {full_path}")
        logger.info(f"路径是否存在: {full_path.exists()}")
        
        # 安全检查：确保文件在output目录内
        try:
            resolved_path = full_path.resolve()
            resolved_output = output_dir.resolve()
            if not str(resolved_path).startswith(str(resolved_output)):
                logger.error(f"路径安全检查失败: {resolved_path} 不在 {resolved_output} 内")
                raise HTTPException(status_code=403, detail="Access denied")
        except Exception as path_e:
            logger.error(f"路径解析错误: {str(path_e)}")
            raise HTTPException(status_code=403, detail="Path resolution failed")
        
        if not full_path.exists():
            logger.error(f"文件不存在: {full_path}")
            # 列出output目录内容用于调试
            try:
                if output_dir.exists():
                    files = list(output_dir.rglob("*"))
                    logger.info(f"output目录内容: {[str(f) for f in files]}")
                else:
                    logger.error("output目录不存在")
            except Exception as list_e:
                logger.error(f"列出目录内容失败: {str(list_e)}")
            raise HTTPException(status_code=404, detail="File not found")
        
        logger.info(f"成功提供文件: {full_path}")
        return FileResponse(full_path)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"提供文件失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to serve file: {str(e)}")

