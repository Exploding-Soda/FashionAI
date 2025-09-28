/**
 * Redesign API Client
 * Handles image upload and redesign requests through Next.js API routes
 */

const API_BASE_URL = "/api"; // 使用 Next.js API 路由

export interface RedesignRequest {
  prompt: string;
  image: File;
  image_2?: File | null;
  image_3?: File | null;
  image_4?: File | null;
}

export interface RedesignResponse {
  taskId: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  message: string;
  outputs?: string[];
}

export interface TaskStatusResponse {
  taskId: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  progress?: number;
  message?: string;
}

export class RedesignApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  private getToken(): string | null {
    if (typeof window === "undefined") {
      console.log("getToken - window is undefined, returning null");
      return null;
    }

    // 尝试从不同的 localStorage key 获取 token
    const token =
      localStorage.getItem("token") || localStorage.getItem("auth_token");
    console.log(
      "getToken - retrieved token:",
      token ? `${token.substring(0, 20)}...` : "null"
    );
    return token;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    const token = this.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
  }

  private getFormDataHeaders(): HeadersInit {
    const headers: HeadersInit = {};

    const token = this.getToken();
    console.log("getFormDataHeaders - token:", token);
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      console.log("getFormDataHeaders - headers:", headers);
    } else {
      console.warn("getFormDataHeaders - No token found!");
    }

    return headers;
  }

  /**
   * 处理401未授权错误
   */
  private handleUnauthorized(): void {
    if (typeof window !== "undefined") {
      // 清除本地存储的token
      localStorage.removeItem("token");
      localStorage.removeItem("auth_token");

      // 重定向到主页
      window.location.href = "/";
    }
  }

  /**
   * 通用请求方法，处理401错误
   */
  private async makeRequest(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const response = await fetch(url, options);

    if (!response.ok) {
      // 处理401未授权错误
      if (response.status === 401) {
        this.handleUnauthorized();
        throw new Error("Token已失效，请重新登录");
      }

      const error = await response.json().catch(() => ({
        detail: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(error.detail || "请求失败");
    }

    return response;
  }

  /**
   * Upload image to get image name for processing
   */
  async uploadImage(image: File): Promise<{ imageName: string }> {
    const formData = new FormData();
    formData.append("file", image);
    formData.append("fileType", "image"); // Default file type for images

    const headers = this.getFormDataHeaders();
    console.log("Upload request headers:", headers);
    console.log("Token:", this.getToken());

    const response = await this.makeRequest(`${this.baseUrl}/proxy/upload`, {
      method: "POST",
      headers: headers,
      body: formData,
    });

    console.log("Upload response status:", response.status);
    console.log(
      "Upload response headers:",
      Object.fromEntries(response.headers.entries())
    );

    const result = await response.json();
    return { imageName: result.fileName || result.imageName };
  }

  /**
   * Submit redesign request using complete_image_edit endpoint
   */
  async submitRedesign(request: RedesignRequest): Promise<RedesignResponse> {
    // Use the new complete_image_edit endpoint that handles upload and edit in one call
    const formData = new FormData();
    formData.append("file", request.image);
    formData.append("fileType", "image");
    formData.append("prompt", request.prompt);

    // 添加额外的图片（如果提供）
    if (request.image_2) {
      formData.append("file_2", request.image_2);
    }
    if (request.image_3) {
      formData.append("file_3", request.image_3);
    }
    if (request.image_4) {
      formData.append("file_4", request.image_4);
    }

    const headers = this.getFormDataHeaders();
    console.log("Complete image edit request headers:", headers);

    const response = await this.makeRequest(
      `${this.baseUrl}/proxy/complete_image_edit`,
      {
        method: "POST",
        headers: headers,
        body: formData,
      }
    );

    console.log("Complete image edit response status:", response.status);

    return await response.json();
  }

  /**
   * Check task status
   */
  async getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    const response = await this.makeRequest(
      `${this.baseUrl}/proxy/tasks/${taskId}`,
      {
        method: "GET",
        headers: this.getHeaders(),
      }
    );

    return await response.json();
  }

  /**
   * Complete task and automatically download/store images
   */
  async completeTask(taskId: string): Promise<{ outputs: string[] }> {
    const response = await this.makeRequest(
      `${this.baseUrl}/proxy/tasks/${taskId}/complete`,
      {
        method: "POST",
        headers: this.getHeaders(),
      }
    );

    const data = await response.json();

    // 将存储路径转换为可访问的URL
    if (data.storagePaths && Array.isArray(data.storagePaths)) {
      const localUrls = data.storagePaths.map((path: string) => {
        // 将本地路径转换为可访问的URL
        // 路径格式: output\\eason\\20250926_093357.png
        // 需要提取: eason/20250926_093357.png
        const relativePath = path.replace(/^output[\\\/]/, "");
        const imageUrl = `${
          this.baseUrl
        }/proxy/static/images/${relativePath.replace(/\\/g, "/")}`;
        console.log("DEBUG - baseUrl:", this.baseUrl);
        console.log("DEBUG - 构建的imageUrl:", imageUrl);
        console.log("DEBUG - API_BASE_URL:", API_BASE_URL);
        return imageUrl;
      });

      return { outputs: localUrls };
    }

    return { outputs: [] };
  }

  /**
   * Get task outputs when completed (stored version) - DEPRECATED
   * Use completeTask instead
   */
  async getTaskOutputs(taskId: string): Promise<{ outputs: string[] }> {
    // 重定向到新的completeTask方法
    return this.completeTask(taskId);
  }

  /**
   * Poll task status until completion and automatically complete task
   */
  async pollTaskCompletion(
    taskId: string,
    onStatusUpdate?: (status: TaskStatusResponse) => void,
    maxAttempts: number = 60,
    intervalMs: number = 5000
  ): Promise<TaskStatusResponse & { outputs?: string[] }> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const status = await this.getTaskStatus(taskId);

        if (onStatusUpdate) {
          onStatusUpdate(status);
        }

        if (status.status === "SUCCESS") {
          // 任务成功完成，自动下载和存储图片
          try {
            const outputs = await this.completeTask(taskId);
            return { ...status, outputs: outputs.outputs };
          } catch (error) {
            console.error("Error completing task:", error);
            return status;
          }
        } else if (status.status === "FAILED") {
          return status;
        }

        attempts++;
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      } catch (error) {
        console.error("Error polling task status:", error);
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    }

    throw new Error("Task polling timeout");
  }

  /**
   * 获取用户的任务历史记录
   */
  async getTaskHistory(page: number = 1): Promise<TaskHistoryItem[]> {
    const response = await this.makeRequest(
      `${this.baseUrl}/proxy/tasks/history?page=${page}`,
      {
        method: "GET",
        headers: this.getHeaders(),
      }
    );

    return response.json();
  }
}

export interface TaskHistoryItem {
  id: number;
  tenant_task_id: string;
  user_id: string;
  runninghub_task_id: string;
  task_type: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  result_data: any;
  storage_paths: string[] | null;
  image_urls: string[];
  error_message: string | null;
}

export const redesignApiClient = new RedesignApiClient();
