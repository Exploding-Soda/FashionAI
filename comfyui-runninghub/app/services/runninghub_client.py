from typing import Any, Optional
import httpx
from fastapi import UploadFile
from .config import get_settings
from .logger import get_runninghub_logger


class RunninghubClient:
    def __init__(self, base_url: str, api_key: str, timeout_seconds: int = 60) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.timeout = httpx.Timeout(timeout_seconds)
        self._client = httpx.AsyncClient(timeout=self.timeout)
        self.logger = get_runninghub_logger()

    async def upload_file(self, file: UploadFile, file_type: str) -> str:
        url = f"{self.base_url}/task/openapi/upload"
        form = {
            "apiKey": (None, self.api_key),
            "fileType": (None, file_type),
            "file": (file.filename, await file.read(), file.content_type or "application/octet-stream"),
        }
        resp = await self._client.post(url, files=form)
        resp.raise_for_status()
        data = resp.json()
        return data.get("fileName") or data.get("data") or ""

    async def create_task(self, webapp_id: str, node_info_list: list[dict]) -> str:
        url = f"{self.base_url}/task/openapi/ai-app/run"
        payload: dict[str, Any] = {
            "apiKey": self.api_key,
            "webappId": webapp_id,
            "nodeInfoList": node_info_list,
        }
        
        self.logger.debug(f"发送请求到: {url}")
        self.logger.debug(f"请求数据: {payload}")
        
        resp = await self._client.post(url, json=payload)
        self.logger.debug(f"响应状态: {resp.status_code}")
        self.logger.debug(f"响应头: {dict(resp.headers)}")
        
        resp.raise_for_status()
        data = resp.json()
        self.logger.debug(f"响应数据: {data}")
        
        task_id = data.get("taskId") or data.get("data") or ""
        if not task_id:
            self.logger.warning(f"未获取到任务ID，响应数据: {data}")
        
        return task_id

    async def get_status(self, task_id: str) -> str:
        url = f"{self.base_url}/task/openapi/status"
        payload = {"apiKey": self.api_key, "taskId": task_id}
        self.logger.debug(f"查询任务状态: {task_id}")
        
        resp = await self._client.post(url, json=payload)
        resp.raise_for_status()
        data = resp.json()
        status = data.get("status") or data.get("data") or ""
        self.logger.debug(f"任务状态: {status}")
        return status

    async def get_outputs(self, task_id: str) -> list[str]:
        url = f"{self.base_url}/task/openapi/outputs"
        payload = {"apiKey": self.api_key, "taskId": task_id}
        self.logger.debug(f"获取任务结果: {task_id}")
        
        resp = await self._client.post(url, json=payload)
        resp.raise_for_status()
        data = resp.json()
        outputs = data.get("outputs") or data.get("data") or []
        self.logger.debug(f"任务结果: {outputs}")
        return outputs


def get_runninghub_client():
    s = get_settings()
    return RunninghubClient(base_url=s.runninghub_host, api_key=s.runninghub_api_key, timeout_seconds=s.request_timeout_seconds)


