import { NextRequest } from "next/server";

const BASE = process.env.FASTAPI_URL || "http://127.0.0.1:8000";

export async function GET() {
  const r = await fetch(`${BASE}/items`, { cache: "no-store" });

  const data = await r.json();
  return new Response(JSON.stringify(data), {
    status: r.status,
    headers: { "content-type": "application/json" },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const r = await fetch(`${BASE}/items`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  return new Response(JSON.stringify(data), {
    status: r.status,
    headers: { "content-type": "application/json" },
  });
}
