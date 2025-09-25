/**
 * Redesign API Client
 * Handles image upload and redesign requests to the tenant service
 */

const TENANT_API_BASE =
  process.env.NEXT_PUBLIC_TENANT_API_URL || "http://localhost:8081";

export interface RedesignRequest {
  prompt: string;
  image: File;
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
    this.baseUrl = TENANT_API_BASE;
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
   * Upload image to get image name for processing
   */
  async uploadImage(image: File): Promise<{ imageName: string }> {
    const formData = new FormData();
    formData.append("file", image);
    formData.append("fileType", "image"); // Default file type for images

    const headers = this.getFormDataHeaders();
    console.log("Upload request headers:", headers);
    console.log("Token:", this.getToken());

    const response = await fetch(`${this.baseUrl}/proxy/upload`, {
      method: "POST",
      headers: headers,
      body: formData,
    });

    console.log("Upload response status:", response.status);
    console.log(
      "Upload response headers:",
      Object.fromEntries(response.headers.entries())
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("Upload error:", error);
      throw new Error(error.detail || "Failed to upload image");
    }

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

    const headers = this.getFormDataHeaders();
    console.log("Complete image edit request headers:", headers);

    const response = await fetch(`${this.baseUrl}/proxy/complete_image_edit`, {
      method: "POST",
      headers: headers,
      body: formData,
    });

    console.log("Complete image edit response status:", response.status);

    if (!response.ok) {
      const error = await response.json();
      console.error("Complete image edit error:", error);
      throw new Error(error.detail || "Failed to submit redesign request");
    }

    return await response.json();
  }

  /**
   * Check task status
   */
  async getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    const response = await fetch(`${this.baseUrl}/proxy/tasks/${taskId}`, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to get task status");
    }

    return await response.json();
  }

  /**
   * Complete task and automatically download/store images
   */
  async completeTask(taskId: string): Promise<{ outputs: string[] }> {
    const response = await fetch(
      `${this.baseUrl}/proxy/tasks/${taskId}/complete`,
      {
        method: "POST",
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to complete task");
    }

    const data = await response.json();

    // 将存储路径转换为可访问的URL
    if (data.storagePaths && Array.isArray(data.storagePaths)) {
      const localUrls = data.storagePaths.map((path: string) => {
        // 将本地路径转换为可访问的URL
        const relativePath = path.replace(/^.*[\\\/]output[\\\/]/, "");
        return `${this.baseUrl}/static/images/${relativePath.replace(
          /\\/g,
          "/"
        )}`;
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
}

export const redesignApiClient = new RedesignApiClient();
