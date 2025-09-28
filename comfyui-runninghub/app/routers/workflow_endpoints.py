"""
动态工作流端点生成器
根据工作流定义自动创建端点
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import Any, Dict, Optional
from pydantic import BaseModel
from ..services.runninghub_client import get_runninghub_client
from ..services.task_manager import get_task_manager
from ..services.logger import get_router_logger
from workflows.workflow_manager import workflow_manager

router = APIRouter()

def create_workflow_endpoint(workflow_name: str):
    """为指定工作流创建端点"""
    
    # 获取工作流的输入模型
    input_model = workflow_manager.get_workflow_input_model(workflow_name)
    
    async def workflow_endpoint(
        payload: input_model,
        client = Depends(get_runninghub_client),
        task_manager = Depends(get_task_manager),
    ):
        logger = get_router_logger()
        try:
            logger.info(f"收到工作流请求: {workflow_name}, 参数: {payload.dict()}")
            
            # 通过工作流管理器获取工作流配置
            workflow_config = workflow_manager.execute_workflow(
                workflow_name,
                **payload.dict()
            )
            
            logger.info(f"工作流配置: webappId={workflow_config['webapp_id']}, 节点数量={len(workflow_config['node_info_list'])}")
            
            # 创建任务
            task_id = await client.create_task(
                webapp_id=workflow_config['webapp_id'],
                node_info_list=workflow_config['node_info_list'],
            )
            logger.info(f"创建任务成功，任务ID: {task_id}")

            if not task_id:
                raise HTTPException(status_code=500, detail="创建任务失败，未获取到任务ID")

            # 立即返回 TaskID，不等待任务完成
            return {
                "taskId": task_id,
                "status": "PENDING",
                "workflow": workflow_config['workflow_name'],
                "message": "任务已创建，请使用 taskId 查询任务状态"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"工作流 {workflow_name} 执行过程中出错: {str(e)}")
            raise HTTPException(status_code=500, detail=f"工作流执行失败: {str(e)}")
    
    return workflow_endpoint

def register_workflow_endpoints():
    """注册所有工作流的端点"""
    for workflow_name in workflow_manager.workflows.keys():
        workflow = workflow_manager.get_workflow(workflow_name)
        input_model = workflow.input_model
        
        # 创建端点函数
        endpoint_func = create_workflow_endpoint(workflow_name)
        
        # 添加端点到路由器
        router.add_api_route(
            f"/generate/{workflow_name}",
            endpoint_func,
            methods=["POST"],
            response_model=Dict[str, Any],
            summary=f"{workflow.display_name}",
            description=workflow.description,
            tags=[f"工作流: {workflow.display_name}"]
        )

# 注册所有工作流端点
register_workflow_endpoints()

@router.get("/workflows")
async def list_workflows():
    """获取可用的工作流列表"""
    return {"workflows": workflow_manager.list_workflows()}

@router.get("/workflows/{workflow_name}")
async def get_workflow_info(workflow_name: str):
    """获取指定工作流的详细信息"""
    try:
        workflow = workflow_manager.get_workflow(workflow_name)
        return {
            "name": workflow.name,
            "display_name": workflow.display_name,
            "description": workflow.description,
            "input_model": workflow.input_model.model_fields,
            "webapp_id": workflow.webapp_id
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/complete_image_edit")
async def complete_image_edit(
    file: UploadFile = File(...),
    fileType: str = Form(default="image"),
    prompt: str = Form(...),
    file_2: Optional[UploadFile] = File(None),
    file_3: Optional[UploadFile] = File(None),
    file_4: Optional[UploadFile] = File(None),
    client = Depends(get_runninghub_client),
    task_manager = Depends(get_task_manager),
):
    """
    完整的图片编辑工作流
    接受multipart/form-data格式的请求，包含图片文件和编辑提示词
    """
    logger = get_router_logger()
    try:
        logger.info(f"收到完整图片编辑请求: 文件={file.filename}, 类型={fileType}, 提示词={prompt}")
        
        # 获取完整图片编辑工作流
        workflow = workflow_manager.get_workflow("complete_image_edit")
        
        # 执行完整的工作流
        result = await workflow.execute_workflow(
            file=file,
            fileType=fileType,
            prompt=prompt,
            file_2=file_2,
            file_3=file_3,
            file_4=file_4
        )
        
        logger.info(f"完整图片编辑工作流执行成功: {result}")
        return result
        
    except Exception as e:
        logger.error(f"完整图片编辑工作流执行失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"图片编辑失败: {str(e)}")
