"""
图片存储服务
负责下载和存储图片到本地
"""
import os
import httpx
import asyncio
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path
from ..services.logger import get_image_storage_logger

try:
    from PIL import Image
except ImportError:  # pragma: no cover - optional dependency
    Image = None

logger = get_image_storage_logger()

class ImageStorageService:
    """图片存储服务"""
    
    THUMBNAIL_DIR_NAME = "thumbnail"
    THUMBNAIL_SIZE = (512, 512)

    def __init__(self, base_storage_path: str = "./output"):
        self.base_storage_path = Path(base_storage_path)
        self.base_storage_path.mkdir(parents=True, exist_ok=True)
        logger.info(f"图片存储服务初始化，存储路径: {self.base_storage_path.absolute()}")
    
    async def download_and_store_images(
        self, 
        user_id: str, 
        outputs: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        下载并存储图片到本地
        
        Args:
            user_id: 用户ID
            outputs: 包含图片URL的输出列表
            
        Returns:
            包含本地路径的输出列表
        """
        user_output_dir = self.base_storage_path / user_id
        user_output_dir.mkdir(parents=True, exist_ok=True)
        thumbnail_dir = user_output_dir / self.THUMBNAIL_DIR_NAME
        thumbnail_dir.mkdir(parents=True, exist_ok=True)
        
        stored_outputs = []
        
        for output in outputs:
            try:
                if "fileUrl" in output and output.get("fileType") in ["png", "jpg", "jpeg", "gif", "webp"]:
                    # 下载图片
                    local_path = await self._download_image(
                        output["fileUrl"], 
                        user_output_dir, 
                        output.get("fileType", "png")
                    )
                    thumbnail_path = None
                    
                    if local_path:
                        thumbnail_path = self._generate_thumbnail(local_path, thumbnail_dir)

                        # 创建新的输出记录，包含本地路径
                        stored_output = {
                            "fileUrl": output["fileUrl"],  # 保留原始URL
                            "localPath": str(local_path),  # 添加本地路径
                            "thumbnailPath": str(thumbnail_path) if thumbnail_path else None,
                            "fileType": output.get("fileType", "png"),
                            "taskCostTime": output.get("taskCostTime", ""),
                            "nodeId": output.get("nodeId", ""),
                            "storedAt": datetime.now().isoformat()
                        }
                        stored_outputs.append(stored_output)
                        logger.info(f"图片存储成功: {local_path}")
                    else:
                        logger.error(f"图片下载失败: {output['fileUrl']}")
                        stored_outputs.append(output)  # 保留原始输出
                else:
                    # 非图片文件，直接保留
                    stored_outputs.append(output)
                    
            except Exception as e:
                logger.error(f"处理输出时出错: {str(e)}")
                stored_outputs.append(output)  # 保留原始输出
                
        return stored_outputs
    
    async def _download_image(
        self, 
        image_url: str, 
        output_dir: Path, 
        file_type: str = "png"
    ) -> Optional[Path]:
        """
        下载单张图片
        
        Args:
            image_url: 图片URL
            output_dir: 输出目录
            file_type: 文件类型
            
        Returns:
            本地文件路径，失败返回None
        """
        try:
            # 生成文件名：精确到秒的时间戳
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{timestamp}.{file_type}"
            local_path = output_dir / filename
            
            logger.info(f"开始下载图片: {image_url}")
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(image_url)
                response.raise_for_status()
                
                # 保存到本地
                with open(local_path, "wb") as f:
                    f.write(response.content)
                
                logger.info(f"图片下载完成: {local_path}")
                return local_path
                
        except Exception as e:
            logger.error(f"下载图片失败 {image_url}: {str(e)}")
            return None
    
    def _generate_thumbnail(self, source_path: Path, thumbnail_dir: Path) -> Optional[Path]:
        """
        生成缩略图
        """
        if Image is None:
            logger.warning("Pillow 未安装，无法生成缩略图")
            return None

        try:
            thumbnail_dir.mkdir(parents=True, exist_ok=True)
            target_path = thumbnail_dir / source_path.name

            with Image.open(source_path) as img:
                img.thumbnail(self.THUMBNAIL_SIZE, getattr(Image, "Resampling", Image).LANCZOS)
                img_format = img.format or source_path.suffix.lstrip(".").upper() or "PNG"
                img.save(target_path, format=img_format)

            logger.info(f"缩略图生成完成: {target_path}")
            return target_path
        except Exception as e:
            logger.error(f"生成缩略图失败 {source_path}: {str(e)}")
            return None

    def sync_all_thumbnails(self):
        """
        遍历所有用户目录，确保缩略图与原图一致
        """
        for user_dir in self.base_storage_path.iterdir():
            if not user_dir.is_dir():
                continue
            if user_dir.name == self.THUMBNAIL_DIR_NAME:
                # 防止误把 thumbnail 目录当成用户目录
                continue
            self._sync_user_thumbnails(user_dir)

    def _sync_user_thumbnails(self, user_dir: Path):
        """
        同步指定用户目录的缩略图
        """
        if Image is None:
            logger.warning("Pillow 未安装，跳过缩略图同步")
            return

        thumbnail_dir = user_dir / self.THUMBNAIL_DIR_NAME
        thumbnail_dir.mkdir(parents=True, exist_ok=True)

        originals = {
            file.name: file
            for file in user_dir.iterdir()
            if file.is_file()
        }
        thumbnails = {
            file.name: file
            for file in thumbnail_dir.iterdir()
            if file.is_file()
        }

        # 生成缺失的缩略图
        for name, original_path in originals.items():
            if name not in thumbnails:
                self._generate_thumbnail(original_path, thumbnail_dir)

        # 删除多余的缩略图
        for name, thumb_path in thumbnails.items():
            if name not in originals:
                try:
                    thumb_path.unlink(missing_ok=True)
                    logger.info(f"删除多余的缩略图: {thumb_path}")
                except Exception as e:
                    logger.error(f"删除缩略图失败 {thumb_path}: {str(e)}")

    def get_image_url(self, local_path: str, base_url: str = "http://localhost:8081") -> str:
        """
        生成图片的访问URL
        
        Args:
            local_path: 本地文件路径
            base_url: 服务器基础URL
            
        Returns:
            可访问的图片URL
        """
        # 将本地路径转换为相对路径
        relative_path = Path(local_path).relative_to(self.base_storage_path)
        return f"{base_url}/static/images/{relative_path}"

# 全局实例
image_storage_service = ImageStorageService()
