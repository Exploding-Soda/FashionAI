# ComfyUI Tenant Service

Multi-tenant microservice for ComfyUI Runninghub integration.

## Architecture

```
comfyui-clothing (Frontend) 
    ↓
comfyui-tenant-service (Multi-tenant Layer)
    ↓
comfyui-runninghub (Backend Service)
```

## Features

- **Multi-tenant isolation**: Each tenant has separate API keys and settings
- **User authentication**: JWT-based authentication system
- **Request proxying**: Transparent proxy to backend Runninghub service
- **Usage tracking**: Monitor API usage per tenant/user
- **Rate limiting**: Prevent abuse with configurable limits

## API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/token` - User login (OAuth2)
- `GET /tenants/me` - Get tenant info

### Proxy API (requires authentication)
- `POST /api/upload` - File upload
- `POST /api/generate` - AI image generation
- `GET /api/tasks/{task_id}` - Task status
- `GET /api/tasks/{task_id}/outputs` - Task results

## Quick Start

### 1. 配置存储方式
```bash
# 复制配置文件
cp .env.example .env

# 选择存储方式 (编辑 .env 文件)
STORAGE_TYPE=json      # JSON 存储 (默认，最简单)
STORAGE_TYPE=sqlite    # SQLite 存储
STORAGE_TYPE=mysql     # MySQL 存储 (生产环境)
```

### 2. 安装依赖
```bash
pip install -r requirements.txt
```

### 3. 测试配置
```bash
python test_config.py
```

### 4. 启动服务
```bash
# Windows
start.bat

# Linux/Mac
uvicorn app.main:app --reload --port 8081
```

## 存储配置

### JSON 存储 (默认，推荐开发)
- ✅ 无需数据库
- ✅ 数据存储在 JSON 文件中
- ✅ 适合开发和测试
- ❌ 不支持高并发

### SQLite 存储
- ✅ 轻量级数据库
- ✅ 单文件存储
- ✅ 适合小型部署
- ❌ 不支持高并发写入

### MySQL 存储 (生产环境推荐)
- ✅ 支持高并发
- ✅ 适合生产环境
- ✅ 支持复杂查询
- ❌ 需要安装 MySQL

## 详细配置

查看 [STORAGE_CONFIG.md](./STORAGE_CONFIG.md) 了解详细的存储配置说明。

## 数据库表结构

### tenants 表
- `id` - 租户ID
- `name` - 租户名称
- `api_key` - 租户API密钥
- `is_active` - 是否激活
- `created_at` - 创建时间
- `updated_at` - 更新时间
- `settings` - 租户设置 (JSON)

### users 表
- `id` - 用户ID
- `username` - 用户名
- `email` - 邮箱 (可选)
- `hashed_password` - 密码哈希
- `tenant_id` - 所属租户ID
- `is_active` - 是否激活
- `created_at` - 创建时间
- `last_login` - 最后登录时间

### api_usage 表
- `id` - 使用记录ID
- `tenant_id` - 租户ID
- `user_id` - 用户ID
- `endpoint` - API端点
- `request_count` - 请求次数
- `created_at` - 创建时间
