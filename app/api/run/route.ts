// app/api/run/route.ts
const BASE = process.env.FASTAPI_URL || "http://127.0.0.1:8000";

export async function POST() {
  const r = await fetch(`${BASE}/run`, { method: "POST" });
  const data = await r.json();
  return new Response(JSON.stringify(data), {
    status: r.status,
    headers: { "content-type": "application/json" },
  });
}
