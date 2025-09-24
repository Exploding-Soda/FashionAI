import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional
from .config import get_settings
from .logger import get_main_logger

class JSONStorage:
    def __init__(self):
        self.settings = get_settings()
        self.logger = get_main_logger()
        self.db_path = Path(self.settings.json_storage_path)
        self.db_path.mkdir(parents=True, exist_ok=True)
    
    def _load_data(self, filename: str) -> List[Dict]:
        """Load data from JSON file"""
        file_path = self.db_path / f"{filename}.json"
        if not file_path.exists():
            return []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            self.logger.error(f"Failed to load {filename}: {str(e)}")
            return []
    
    def _save_data(self, filename: str, data: List[Dict]):
        """Save data to JSON file"""
        file_path = self.db_path / f"{filename}.json"
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2, default=str)
        except Exception as e:
            self.logger.error(f"Failed to save {filename}: {str(e)}")
    
    # Tenant operations
    def create_tenant(self, name: str, settings: str = "{}") -> Dict:
        """Create a new tenant"""
        tenants = self._load_data("tenants")
        
        # Check if tenant exists
        if any(t.get("name") == name for t in tenants):
            raise ValueError("Tenant name already exists")
        
        tenant = {
            "id": len(tenants) + 1,
            "name": name,
            "api_key": str(uuid.uuid4()),
            "is_active": True,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "settings": settings
        }
        
        tenants.append(tenant)
        self._save_data("tenants", tenants)
        self.logger.info(f"Created tenant: {name}")
        return tenant
    
    def get_tenant_by_id(self, tenant_id: int) -> Optional[Dict]:
        """Get tenant by ID"""
        tenants = self._load_data("tenants")
        return next((t for t in tenants if t.get("id") == tenant_id), None)
    
    def get_tenant_by_api_key(self, api_key: str) -> Optional[Dict]:
        """Get tenant by API key"""
        tenants = self._load_data("tenants")
        return next((t for t in tenants if t.get("api_key") == api_key and t.get("is_active")), None)
    
    # User operations
    def create_user(self, username: str, password_hash: str, tenant_id: int, email: str = None) -> Dict:
        """Create a new user"""
        users = self._load_data("users")
        
        # Check if user exists
        if any(u.get("username") == username for u in users):
            raise ValueError("Username already exists")
        if email and any(u.get("email") == email for u in users):
            raise ValueError("Email already exists")
        
        user = {
            "id": len(users) + 1,
            "username": username,
            "email": email,
            "hashed_password": password_hash,
            "tenant_id": tenant_id,
            "is_active": True,
            "created_at": datetime.utcnow().isoformat(),
            "last_login": None
        }
        
        users.append(user)
        self._save_data("users", users)
        self.logger.info(f"Created user: {username}")
        return user
    
    def get_user_by_username(self, username: str) -> Optional[Dict]:
        """Get user by username"""
        users = self._load_data("users")
        return next((u for u in users if u.get("username") == username), None)
    
    def get_user_by_email(self, email: str) -> Optional[Dict]:
        """Get user by email"""
        users = self._load_data("users")
        return next((u for u in users if u.get("email") == email), None)
    
    def get_user_by_id(self, user_id: int) -> Optional[Dict]:
        """Get user by ID"""
        users = self._load_data("users")
        return next((u for u in users if u.get("id") == user_id), None)
    
    def update_user_last_login(self, user_id: int):
        """Update user's last login time"""
        users = self._load_data("users")
        for user in users:
            if user.get("id") == user_id:
                user["last_login"] = datetime.utcnow().isoformat()
                break
        self._save_data("users", users)
    
    # Usage tracking
    def log_api_usage(self, tenant_id: int, user_id: int, endpoint: str):
        """Log API usage"""
        usage = self._load_data("api_usage")
        
        usage_record = {
            "id": len(usage) + 1,
            "tenant_id": tenant_id,
            "user_id": user_id,
            "endpoint": endpoint,
            "request_count": 1,
            "created_at": datetime.utcnow().isoformat()
        }
        
        usage.append(usage_record)
        self._save_data("api_usage", usage)
