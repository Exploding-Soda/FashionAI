from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from pydantic import BaseModel
from ..services.runninghub_client import get_runninghub_client
from ..services.task_manager import get_task_manager
from ..services.logger import get_router_logger


router = APIRouter()


class GenerateRequest(BaseModel):
    webappId: str
    nodeInfoList: list[dict]


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    fileType: str = Form(...),
    client = Depends(get_runninghub_client),
):
    try:
        result = await client.upload_file(file=file, file_type=fileType)
        return {"fileName": result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/generate")
async def generate(
    payload: GenerateRequest,
    client = Depends(get_runninghub_client),
    task_manager = Depends(get_task_manager),
):
    logger = get_router_logger()
    try:
        logger.info(f"收到生成请求: webappId={payload.webappId}, nodeInfoList长度={len(payload.nodeInfoList)}")
        
        # 检查是否有有效的任务ID
        if not payload.nodeInfoList:
            raise HTTPException(status_code=400, detail="nodeInfoList 不能为空")
        
        task_id = await client.create_task(
            webapp_id=payload.webappId,
            node_info_list=payload.nodeInfoList,
        )
        logger.info(f"创建任务成功，任务ID: {task_id}")

        if not task_id:
            raise HTTPException(status_code=500, detail="创建任务失败，未获取到任务ID")

        status = await task_manager.poll_task_until_complete(task_id)
        logger.info(f"任务完成，状态: {status}")
        
        if status != "SUCCESS":
            return {"taskId": task_id, "status": status}

        outputs = await client.get_outputs(task_id)
        logger.info(f"获取结果成功，输出数量: {len(outputs)}")
        return {"taskId": task_id, "status": status, "outputs": outputs}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"生成过程中出错: {str(e)}")
        raise HTTPException(status_code=500, detail=f"生成失败: {str(e)}")


@router.get("/tasks/{task_id}")
async def get_task_status(
    task_id: str,
    task_manager = Depends(get_task_manager),
):
    status = await task_manager.get_status(task_id)
    return {"taskId": task_id, "status": status}


@router.get("/tasks/{task_id}/outputs")
async def get_task_outputs(
    task_id: str,
    client = Depends(get_runninghub_client),
):
    outputs = await client.get_outputs(task_id)
    return {"taskId": task_id, "outputs": outputs}


