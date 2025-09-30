import { NextRequest, NextResponse } from "next/server";

const TENANT_API_BASE =
  process.env.NEXT_PUBLIC_TENANT_API_URL || "http://localhost:8081";

async function parseJson(response: Response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    console.error("Failed to parse tenant response as JSON", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { detail: "Authorization header required" },
        { status: 401 }
      );
    }

    const payload = await request.json();

    const response = await fetch(`${TENANT_API_BASE}/proxy/llm/chat`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await parseJson(response);

    if (!response.ok) {
      return NextResponse.json(
        data ?? { detail: "LLM service request failed" },
        { status: response.status }
      );
    }

    return NextResponse.json(data ?? {});
  } catch (error) {
    console.error("LLM chat proxy error:", error);
    return NextResponse.json(
      { detail: "Internal server error" },
      { status: 500 }
    );
  }
}
