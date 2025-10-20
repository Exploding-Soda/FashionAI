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

export interface PaletteGroup {
  colors: Array<{ r: number; g: number; b: number }>;
  note?: string;
}

export interface StripePatternUnit {
  color: { r: number; g: number; b: number };
  widthPx: number;
}

export interface StripeLLMVariationUnit {
  color: { r: number; g: number; b: number };
  relativeWidth: number;
}

export interface StripeLLMVariation {
  title: string;
  styleNote?: string;
  stripeUnits: StripeLLMVariationUnit[];
}

export interface StripeLLMResponse {
  variations: StripeLLMVariation[];
  guidance?: string;
}

export interface PaletteResponse {
  groups: PaletteGroup[];
  /**
   * Whether the analysed garment primarily features stripe-style prints.
   */
  isStripePattern?: boolean;
  /**
   * Minimal repeating stripe unit when `isStripePattern` is true.
   */
  stripePatternUnit?: StripePatternUnit[];
}

export interface TaskStatusResponse {
  taskId: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  progress?: number;
  message?: string;
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
  storage_paths: Array<string | { original?: string | null; thumbnail?: string | null; localPath?: string | null }> | null;
  thumbnail_paths?: Array<string | { original?: string | null; thumbnail?: string | null }> | null;
  image_urls: string[];
  thumbnail_urls?: string[];
  error_message: string | null;
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

  async requestStripeVariations(payload: {
    stripeUnits: Array<{ color: { r: number; g: number; b: number }; widthPx: number }>;
    paletteGroups?: PaletteGroup[];
    targetCount?: number;
  }): Promise<StripeLLMResponse> {
    const res = await this.makeRequest(
      `${this.baseUrl}/proxy/llm/stripe_variations`,
      {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      }
    );
    return res.json();
  }

  async requestColorPalettes(file: File): Promise<PaletteResponse> {
    const form = new FormData();
    form.append("file", file);
    // 通过LLM对图中配色方案进行分析，仅返回RGB数组分组，并额外判断是否为条纹印花
    const prompt = `请作为服装配色顾问，观察我提供的图片中的服装主配色与可衍生的协调配色方案，输出3-6组颜色组合，同时判断画面中的印花是否属于条纹式印花。若是条纹印花，请额外给出“最小印花样式”，即单次重复单元内每个色块的RGB颜色与大致宽度（px），用数组表示，例如: [{ "color": {"r":0,"g":0,"b":0}, "widthPx": 50 }, { "color": {"r":255,"g":255,"b":255}, "widthPx": 50 } ]。仅返回JSON，格式：{ "groups": [ { "colors": [ {"r":0-255,"g":0-255,"b":0-255}, ... ] } , ... ], "isStripePattern": true|false, "stripePatternUnit": [ { "color": {"r":0-255,"g":0-255,"b":0-255}, "widthPx": number }, ... ] }，不要返回多余说明文字。若无法确定条纹特征或宽度，请根据视觉倾向返回最接近的判断；若无法给出条纹描述，可返回空数组。`;
    form.append("prompt", prompt);

    const res = await this.makeRequest(
      `${this.baseUrl}/proxy/llm/palette_from_image`,
      { method: "POST", headers: this.getFormHeaders(), body: form }
    );
    // 兼容后端可能返回字符串或对象
    const data = await res.json();
    if (typeof data === "string") {
      try { return JSON.parse(data) as PaletteResponse } catch { return { groups: [] } }
    }
    return data as PaletteResponse;
  }

  async submitVariantOverlay(imageDataUrl: string): Promise<ExtractResponse> {
    const response = await fetch(imageDataUrl);
    const blob = await response.blob();
    const extension =
      blob.type === "image/png"
        ? "png"
        : blob.type === "image/jpeg"
          ? "jpg"
          : "png";
    const fileName = `variant-overlay-${Date.now()}.${extension}`;
    const file = new File([blob], fileName, { type: blob.type || "image/png" });

    const form = new FormData();
    form.append("file", file);
    form.append("fileType", "image");

    const res = await this.makeRequest(
      `${this.baseUrl}/proxy/variant_overlay`,
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
    const outputs: string[] = [];

    const storagePaths =
      (Array.isArray(data.storagePaths) && data.storagePaths) ||
      (Array.isArray(data.storage_paths) && data.storage_paths) ||
      [];

    if (storagePaths.length > 0) {
      for (const entry of storagePaths) {
        const rawPath =
          typeof entry === "string"
            ? entry
            : entry?.original || entry?.localPath || null;

        if (!rawPath) continue;

        const relative = rawPath.replace(/^\.?[\\\/]?output[\\\/]/i, "");
        const normalised = relative.replace(/\\/g, "/");
        outputs.push(`${this.baseUrl}/proxy/static/images/${normalised}`);
      }
    } else if (Array.isArray(data.outputs)) {
      for (const item of data.outputs) {
        if (!item) continue;
        if (typeof item === "string") {
          outputs.push(item);
        } else if (typeof item === "object" && "localPath" in item && typeof item.localPath === "string") {
          const relative = item.localPath.replace(/^\.?[\\\/]?output[\\\/]/i, "");
          outputs.push(`${this.baseUrl}/proxy/static/images/${relative.replace(/\\/g, "/")}`);
        } else if (typeof item === "object" && "fileUrl" in item && typeof item.fileUrl === "string") {
          outputs.push(item.fileUrl);
        }
      }
    }

    return { outputs };
  }

  async getTaskHistory(page: number = 1, taskType?: string, limit?: number): Promise<TaskHistoryItem[]> {
    const qs = new URLSearchParams({ page: String(page) });
    if (taskType) qs.set('task_type', taskType);
    if (limit) qs.set('limit', String(limit));
    const res = await this.makeRequest(
      `${this.baseUrl}/proxy/tasks/history?${qs.toString()}`,
      { method: "GET", headers: this.getHeaders() }
    );
    return res.json();
  }
}

export const extractApiClient = new ExtractApiClient();
