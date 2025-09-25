"""
任务记录服务
管理tenant任务记录
"""
import json
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from ..models.database import TenantTaskRecord
from ..models.database import get_db
from ..services.logger import get_task_record_logger

logger = get_task_record_logger()

class TaskRecordService:
    """任务记录服务"""
    
    def __init__(self):
        pass
    
    def create_task_record(
        self, 
        user_id: str, 
        runninghub_task_id: str, 
        db,
        task_type: str = None
    ) -> str:
        """
        创建任务记录
        
        Args:
            user_id: 用户ID
            runninghub_task_id: RunningHub任务ID
            db: 数据库会话或JSON存储
            task_type: 任务类型（如 "targeted_redesign", "image_edit" 等）
            
        Returns:
            tenant_task_id: Tenant任务ID
        """
        tenant_task_id = f"tenant_{uuid.uuid4().hex[:16]}"
        
        # 检查是否使用数据库存储
        if hasattr(db, 'add'):  # SQLAlchemy session
            task_record = TenantTaskRecord(
                tenant_task_id=tenant_task_id,
                user_id=user_id,
                runninghub_task_id=runninghub_task_id,
                task_type=task_type,
                status="PENDING"
            )
            
            db.add(task_record)
            db.commit()
            db.refresh(task_record)
        else:
            # JSON存储模式，使用JSONStorage
            task_record = db.create_task_record(
                tenant_task_id=tenant_task_id,
                user_id=user_id,
                runninghub_task_id=runninghub_task_id,
                task_type=task_type
            )
        
        logger.info(f"创建任务记录: {tenant_task_id}, 用户: {user_id}, RunningHub任务: {runninghub_task_id}")
        return tenant_task_id
    
    def update_task_success(
        self,
        tenant_task_id: str,
        result_data: Dict[str, Any],
        storage_paths: List[str],
        db
    ) -> bool:
        """
        更新任务为成功状态
        
        Args:
            tenant_task_id: Tenant任务ID
            result_data: 结果数据
            storage_paths: 存储路径列表
            db: 数据库会话
            
        Returns:
            是否更新成功
        """
        try:
            # 检查是否使用数据库存储
            if hasattr(db, 'query'):  # SQLAlchemy session
                task_record = db.query(TenantTaskRecord).filter(
                    TenantTaskRecord.tenant_task_id == tenant_task_id
                ).first()
                
                if not task_record:
                    logger.error(f"未找到任务记录: {tenant_task_id}")
                    return False
                
                task_record.status = "SUCCESS"
                task_record.completed_at = datetime.now()
                task_record.result_data = json.dumps(result_data, ensure_ascii=False)
                task_record.storage_paths = json.dumps(storage_paths, ensure_ascii=False)
                
                db.commit()
                logger.info(f"任务记录更新为成功: {tenant_task_id}")
                return True
            else:
                # JSON存储模式，使用JSONStorage
                return db.update_task_success(tenant_task_id, result_data, storage_paths)
            
        except Exception as e:
            logger.error(f"更新任务记录失败: {str(e)}")
            if hasattr(db, 'rollback'):
                db.rollback()
            return False
    
    def update_task_failed(
        self,
        tenant_task_id: str,
        error_message: str,
        db
    ) -> bool:
        """
        更新任务为失败状态
        
        Args:
            tenant_task_id: Tenant任务ID
            error_message: 错误信息
            db: 数据库会话
            
        Returns:
            是否更新成功
        """
        try:
            # 检查是否使用数据库存储
            if hasattr(db, 'query'):  # SQLAlchemy session
                task_record = db.query(TenantTaskRecord).filter(
                    TenantTaskRecord.tenant_task_id == tenant_task_id
                ).first()
                
                if not task_record:
                    logger.error(f"未找到任务记录: {tenant_task_id}")
                    return False
                
                task_record.status = "FAILED"
                task_record.completed_at = datetime.now()
                task_record.error_message = error_message
                
                db.commit()
                logger.info(f"任务记录更新为失败: {tenant_task_id}")
                return True
            else:
                # JSON存储模式，使用JSONStorage
                return db.update_task_failed(tenant_task_id, error_message)
            
        except Exception as e:
            logger.error(f"更新任务记录失败: {str(e)}")
            if hasattr(db, 'rollback'):
                db.rollback()
            return False
    
    def get_task_record(self, tenant_task_id: str, db) -> Optional[Dict[str, Any]]:
        """
        获取任务记录
        
        Args:
            tenant_task_id: Tenant任务ID
            db: 数据库会话
            
        Returns:
            任务记录字典，未找到返回None
        """
        try:
            # 检查是否使用数据库存储
            if hasattr(db, 'query'):  # SQLAlchemy session
                task_record = db.query(TenantTaskRecord).filter(
                    TenantTaskRecord.tenant_task_id == tenant_task_id
                ).first()
                
                if task_record:
                    return task_record.to_dict()
                return None
            else:
                # JSON存储模式，使用JSONStorage
                return db.get_task_record_by_tenant_id(tenant_task_id)
            
        except Exception as e:
            logger.error(f"获取任务记录失败: {str(e)}")
            return None
    
    def get_user_tasks(
        self, 
        user_id: str, 
        limit: int = 50, 
        db = None
    ) -> List[Dict[str, Any]]:
        """
        获取用户的任务记录
        
        Args:
            user_id: 用户ID
            limit: 限制数量
            db: 数据库会话
            
        Returns:
            任务记录列表
        """
        try:
            if db is None:
                db = next(get_db())
            
            # 检查是否使用数据库存储
            if hasattr(db, 'query'):  # SQLAlchemy session
                task_records = db.query(TenantTaskRecord).filter(
                    TenantTaskRecord.user_id == user_id
                ).order_by(TenantTaskRecord.created_at.desc()).limit(limit).all()
                
                return [record.to_dict() for record in task_records]
            else:
                # JSON存储模式，使用JSONStorage
                return db.get_user_tasks(user_id, limit)
            
        except Exception as e:
            logger.error(f"获取用户任务记录失败: {str(e)}")
            return []

# 全局实例
task_record_service = TaskRecordService()
