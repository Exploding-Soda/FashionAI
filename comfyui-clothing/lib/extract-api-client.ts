/**
 * Extract API Client
 * Handles pattern extract workflow via Next.js API proxy
 */

const API_BASE_URL = "/api"; // Next.js API routes

export interface ExtractResponse {
  taskId: string;
  status: "PENDING" | "SUCCESS" | "FAILED" | "created";
  message: string;
}

export interface TaskStatusResponse {
  taskId: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  progress?: number;
  message?: string;
}

export class ExtractApiClient {
  private baseUrl: string = API_BASE_URL;

  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return (
      localStorage.getItem("token") || localStorage.getItem("auth_token")
    );
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = { "Content-Type": "application/json" };
    const token = this.getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  }

  private getFormHeaders(): HeadersInit {
    const headers: HeadersInit = {};
    const token = this.getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  }

  private async makeRequest(url: string, options: RequestInit = {}) {
    const res = await fetch(url, options);
    if (!res.ok) {
      if (res.status === 401 && typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("auth_token");
        window.location.href = "/";
      }
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "请求失败");
    }
    return res;
  }

  async submitExtract(file: File): Promise<ExtractResponse> {
    const form = new FormData();
    form.append("file", file);
    form.append("fileType", "image");

    const res = await this.makeRequest(
      `${this.baseUrl}/proxy/complete_pattern_extract`,
      { method: "POST", headers: this.getFormHeaders(), body: form }
    );
    return res.json();
  }

  async getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    const res = await this.makeRequest(
      `${this.baseUrl}/proxy/tasks/${taskId}`,
      { headers: this.getHeaders() }
    );
    return res.json();
  }

  async completeTask(taskId: string): Promise<{ outputs: string[] }> {
    const res = await this.makeRequest(
      `${this.baseUrl}/proxy/tasks/${taskId}/complete`,
      { method: "POST", headers: this.getHeaders() }
    );
    const data = await res.json();
    if (data.storagePaths && Array.isArray(data.storagePaths)) {
      const localUrls = data.storagePaths.map((p: string) => {
        const relative = p.replace(/^output[\\\/]/, "");
        return `${this.baseUrl}/proxy/static/images/${relative.replace(/\\/g, "/")}`;
      });
      return { outputs: localUrls };
    }
    return { outputs: [] };
  }
}

export const extractApiClient = new ExtractApiClient();

