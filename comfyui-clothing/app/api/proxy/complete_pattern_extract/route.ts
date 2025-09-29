import { NextRequest, NextResponse } from "next/server";

const TENANT_API_BASE =
  process.env.NEXT_PUBLIC_TENANT_API_URL || "http://localhost:8081";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { detail: "Authorization header required" },
        { status: 401 }
      );
    }

    const formData = await request.formData();

    const response = await fetch(
      `${TENANT_API_BASE}/proxy/complete_pattern_extract`,
      {
        method: "POST",
        headers: { Authorization: authHeader },
        body: formData,
      }
    );

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("Complete pattern extract proxy error:", error);
    return NextResponse.json(
      { detail: "Internal server error" },
      { status: 500 }
    );
  }
}

