"""
完整的图片编辑工作流
整合文件上传和图片编辑功能
"""
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from fastapi import UploadFile
from .workflow_manager import Workflow
from app.services.runninghub_client import RunninghubClient
from app.services.config import get_settings
from app.services.logger import get_runninghub_logger


class CompleteImageEditInput(BaseModel):
    """完整图片编辑工作流输入参数"""
    file: UploadFile
    fileType: str = "image"
    prompt: str = ""


class CompleteImageEditWorkflow(Workflow):
    """完整的图片编辑工作流 - 包含上传和编辑"""
    
    def __init__(self):
        # 延迟初始化，避免在导入时出错
        self._settings = None
        self._client = None
        self._logger = None
    
    @property
    def settings(self):
        if self._settings is None:
            self._settings = get_settings()
        return self._settings
    
    @property
    def client(self):
        if self._client is None:
            self._client = RunninghubClient(
                base_url=self.settings.runninghub_host,
                api_key=self.settings.runninghub_api_key,
                timeout_seconds=self.settings.request_timeout_seconds
            )
        return self._client
    
    @property
    def logger(self):
        if self._logger is None:
            self._logger = get_runninghub_logger()
        return self._logger
    
    @property
    def webapp_id(self) -> str:
        return "1970781747573125122"
    
    @property
    def name(self) -> str:
        return "complete_image_edit"
    
    @property
    def display_name(self) -> str:
        return "完整图片编辑"
    
    @property
    def description(self) -> str:
        return "上传图片并进行编辑，接受二进制图片文件和编辑提示词"
    
    @property
    def input_model(self):
        return CompleteImageEditInput
    
    async def execute_workflow(self, file: UploadFile, fileType: str = "image", prompt: str = "", **kwargs) -> Dict[str, Any]:
        """
        执行完整的工作流：上传图片 -> 编辑图片
        
        Args:
            file: 上传的图片文件
            fileType: 文件类型
            prompt: 编辑提示词
            
        Returns:
            包含任务ID和状态的结果
        """
        try:
            # 第一步：上传图片
            self.logger.info(f"开始上传图片: {file.filename}")
            image_name = await self.client.upload_file(file=file, file_type=fileType)
            
            self.logger.info(f"上传接口返回的原始数据: {image_name}")
            self.logger.info(f"返回数据类型: {type(image_name)}")
            
            if not image_name:
                raise ValueError("图片上传失败，未获取到图片名称")
            
            # 确保image_name是字符串格式的路径
            if isinstance(image_name, dict):
                # 如果是字典，提取fileName
                image_name = image_name.get("fileName", str(image_name))
            elif not isinstance(image_name, str):
                image_name = str(image_name)
            
            self.logger.info(f"处理后的图片名称: {image_name}")
            
            # 第二步：执行图片编辑
            self.logger.info(f"开始执行图片编辑，提示词: {prompt}")
            node_info_list = self.get_node_info_list(prompt=prompt, image_name=image_name)
            
            task_id = await self.client.create_task(
                webapp_id=self.webapp_id,
                node_info_list=node_info_list
            )
            
            self.logger.info(f"create_task返回的原始数据: {task_id}")
            self.logger.info(f"返回数据类型: {type(task_id)}")
            
            if not task_id:
                raise ValueError("任务创建失败，未获取到任务ID")
            
            # 确保task_id是字符串格式
            if isinstance(task_id, dict):
                # 如果是字典，提取taskId字段
                task_id = task_id.get("taskId", str(task_id))
            elif not isinstance(task_id, str):
                task_id = str(task_id)
            
            self.logger.info(f"处理后的任务ID: {task_id}")
            
            return {
                "taskId": task_id,
                "imageName": image_name,
                "status": "created",
                "message": "图片编辑任务已创建"
            }
            
        except Exception as e:
            self.logger.error(f"工作流执行失败: {str(e)}")
            raise e
    
    def get_node_info_list(self, prompt: str = "", image_name: str = "", **kwargs) -> List[Dict[str, Any]]:
        """
        生成图片编辑的节点信息列表
        
        Args:
            prompt: 编辑提示词
            image_name: 图片名称
        """
        # 确保 prompt 是字符串
        if isinstance(prompt, dict):
            prompt = str(prompt)
        elif not isinstance(prompt, str):
            prompt = str(prompt)
        
        if not prompt.strip():
            raise ValueError("编辑提示词不能为空")
        
        # 确保 image_name 是字符串
        if isinstance(image_name, dict):
            image_name = str(image_name)
        elif not isinstance(image_name, str):
            image_name = str(image_name)
        
        if not image_name.strip():
            raise ValueError("图片名称不能为空")
        
        return [
            {
                "nodeId": "35",
                "fieldName": "image",
                "fieldValue": image_name,
                "description": "image"
            },
            {
                "nodeId": "46",
                "fieldName": "text",
                "fieldValue": prompt,
                "description": "text"
            }
        ]


# 为了向后兼容，保留原有的ImageEditWorkflow
class ImageEditInput(BaseModel):
    """图片编辑工作流输入参数（仅编辑，需要预先上传的图片名称）"""
    prompt: str = ""
    image_name: str = ""


class ImageEditWorkflow(Workflow):
    """图片编辑工作流（仅编辑功能）"""
    
    @property
    def webapp_id(self) -> str:
        return "1970781747573125122"
    
    @property
    def name(self) -> str:
        return "image_edit"
    
    @property
    def display_name(self) -> str:
        return "图片编辑"
    
    @property
    def description(self) -> str:
        return "基于图片和提示词进行编辑，需要提供图片名称和编辑提示词"
    
    @property
    def input_model(self):
        return ImageEditInput
    
    def get_node_info_list(self, prompt: str = "", image_name: str = "", **kwargs) -> List[Dict[str, Any]]:
        """
        生成图片编辑的节点信息列表
        
        Args:
            prompt: 编辑提示词
            image_name: 图片名称
        """
        # 确保 prompt 是字符串
        if isinstance(prompt, dict):
            prompt = str(prompt)
        elif not isinstance(prompt, str):
            prompt = str(prompt)
        
        if not prompt.strip():
            raise ValueError("编辑提示词不能为空")
        
        # 确保 image_name 是字符串
        if isinstance(image_name, dict):
            image_name = str(image_name)
        elif not isinstance(image_name, str):
            image_name = str(image_name)
        
        if not image_name.strip():
            raise ValueError("图片名称不能为空")
        
        return [
            {
                "nodeId": "35",
                "fieldName": "image",
                "fieldValue": image_name,
                "description": "image"
            },
            {
                "nodeId": "46",
                "fieldName": "text",
                "fieldValue": prompt,
                "description": "text"
            }
        ]
