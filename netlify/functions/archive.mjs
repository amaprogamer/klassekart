import { getStore } from "@netlify/blobs";

export default async (req) => {
  const url = new URL(req.url);
  const id = (url.searchParams.get("id") || "").toLowerCase().replace(/[^a-z0-9_-]+/g, "").slice(0, 40);
  if (!id) return new Response(JSON.stringify({ error: "mangler navn" }), { status: 400, headers: { "content-type": "application/json" } });
  const store = getStore("klassekart");
  if (req.method === "GET") {
    const data = await store.get(id, { type: "text" });
    return new Response(data || "", { status: 200, headers: { "content-type": "application/json", "cache-control": "no-store" } });
  }
  if (req.method === "POST" || req.method === "PUT") {
    const body = await req.text();
    if (body.length > 3_000_000) return new Response(JSON.stringify({ error: "for stort" }), { status: 413, headers: { "content-type": "application/json" } });
    try { JSON.parse(body); } catch (e) { return new Response(JSON.stringify({ error: "ugyldig" }), { status: 400, headers: { "content-type": "application/json" } }); }
    await store.set(id, body);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } });
  }
  return new Response(JSON.stringify({ error: "metode" }), { status: 405, headers: { "content-type": "application/json" } });
};

export const config = { path: "/api/archive" };
