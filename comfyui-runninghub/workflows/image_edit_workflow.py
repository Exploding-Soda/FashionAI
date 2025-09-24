"""
图片编辑工作流
基于图片和提示词进行编辑
"""
from typing import Dict, Any, List
from pydantic import BaseModel
from .workflow_manager import Workflow

class ImageEditInput(BaseModel):
    """图片编辑工作流输入参数"""
    prompt: str = ""
    image_name: str = ""

class ImageEditWorkflow(Workflow):
    """图片编辑工作流"""
    
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
        if not prompt.strip():
            raise ValueError("编辑提示词不能为空")
        
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
