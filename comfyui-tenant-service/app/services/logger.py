import logging
import os
from datetime import datetime
from pathlib import Path

class ServiceLogger:
    def __init__(self, service_name: str):
        self.service_name = service_name
        self.log_dir = Path("logs") / service_name
        self.log_dir.mkdir(parents=True, exist_ok=True)
        
        # Create hourly log file
        now = datetime.now()
        log_filename = f"{now.strftime('%Y%m%d%H')}.log"
        log_path = self.log_dir / log_filename
        
        # Configure logger
        self.logger = logging.getLogger(f"{service_name}_{now.strftime('%Y%m%d%H')}")
        self.logger.setLevel(logging.DEBUG)
        
        if not self.logger.handlers:
            handler = logging.FileHandler(log_path, encoding='utf-8')
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                datefmt='%Y-%m-%d %H:%M:%S'
            )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
    
    def debug(self, message: str):
        self.logger.debug(message)
    
    def info(self, message: str):
        self.logger.info(message)
    
    def warning(self, message: str):
        self.logger.warning(message)
    
    def error(self, message: str):
        self.logger.error(message)

def get_auth_logger():
    return ServiceLogger("auth")

def get_tenant_logger():
    return ServiceLogger("tenant")

def get_proxy_logger():
    return ServiceLogger("proxy")

def get_main_logger():
    return ServiceLogger("main")

def get_task_record_logger():
    return ServiceLogger("task_record")

def get_image_storage_logger():
    return ServiceLogger("image_storage")