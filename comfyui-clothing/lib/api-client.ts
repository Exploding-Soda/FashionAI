/**
 * API 客户端 - 通过 Next.js API 路由与 comfyui-tenant-service 通信
 */

const API_BASE_URL = "/api"; // 使用 Next.js API 路由

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  tenant_id: number;
}

export interface RegisterResponse {
  id: number;
  username: string;
  email: string | null;
  tenant_id: number;
  is_active: boolean;
}

export interface ApiError {
  detail: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const defaultHeaders = {
      "Content-Type": "application/json",
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData: ApiError = await response.json().catch(() => ({
          detail: `HTTP ${response.status}: ${response.statusText}`,
        }));
        throw new Error(errorData.detail);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("网络请求失败");
    }
  }

  /**
   * 用户登录
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const formData = new URLSearchParams();
    formData.append("username", credentials.username);
    formData.append("password", credentials.password);

    return this.request<LoginResponse>("/auth/login", {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
  }

  /**
   * 用户注册
   */
  async register(userData: RegisterRequest): Promise<RegisterResponse> {
    return this.request<RegisterResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  /**
   * 获取用户信息
   */
  async getUserInfo(token: string): Promise<any> {
    return this.request("/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  /**
   * 获取租户信息
   */
  async getTenantInfo(token: string): Promise<any> {
    return this.request("/tenants/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  /**
   * 代理请求到后端服务
   */
  async proxyRequest(
    endpoint: string,
    token: string,
    options: RequestInit = {}
  ): Promise<any> {
    return this.request(`/api${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  }
}

// 创建默认实例
export const apiClient = new ApiClient();

// 导出类型
export type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  ApiError,
};
