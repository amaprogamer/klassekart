// Netlify-funksjon: lagrer klassekart-arkivet i et GitHub-repo.
// GitHub-nøkkelen (token) ligger som miljøvariabel i Netlify (GH_TOKEN),
// aldri i nettsidekoden. Nettleseren ser aldri nøkkelen.
const REPO = process.env.GH_REPO || "amaprogamer/klassekart-data";
const FILE = process.env.GH_PATH || "klassekart.json";
const TOKEN = process.env.GH_TOKEN;
const API = "https://api.github.com/repos/" + REPO + "/contents/" + FILE;

function ghHeaders(){
  return {
    "Authorization": "Bearer " + TOKEN,
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "klassekart"
  };
}
function json(obj, status){
  return new Response(JSON.stringify(obj), {status: status || 200, headers: {"content-type": "application/json", "cache-control": "no-store"}});
}

export default async (req) => {
  if (!TOKEN) return json({error: "GH_TOKEN mangler i Netlify-miljoet"}, 500);

  if (req.method === "GET"){
    const r = await fetch(API, {headers: ghHeaders(), cache: "no-store"});
    if (r.status === 404) return new Response("", {status: 200, headers: {"content-type": "application/json", "cache-control": "no-store"}});
    if (!r.ok) return json({error: "github " + r.status}, 502);
    const data = await r.json();
    const content = Buffer.from(data.content || "", "base64").toString("utf-8");
    return new Response(content, {status: 200, headers: {"content-type": "application/json", "cache-control": "no-store"}});
  }

  if (req.method === "POST" || req.method === "PUT"){
    const body = await req.text();
    if (body.length > 3000000) return json({error: "for stort"}, 413);
    let parsed;
    try { parsed = JSON.parse(body); } catch (e){ return json({error: "ugyldig"}, 400); }
    const pretty = JSON.stringify(parsed, null, 2);
    let sha = null;
    const g = await fetch(API, {headers: ghHeaders(), cache: "no-store"});
    if (g.ok){ const d = await g.json(); sha = d.sha; }
    const payload = {message: "Oppdater klassekart " + new Date().toISOString(), content: Buffer.from(pretty, "utf-8").toString("base64")};
    if (sha) payload.sha = sha;
    const p = await fetch(API, {method: "PUT", headers: Object.assign({"Content-Type": "application/json"}, ghHeaders()), body: JSON.stringify(payload)});
    if (!p.ok){ const t = await p.text(); return json({error: "github " + p.status, detail: t.slice(0, 160)}, 502); }
    return json({ok: true});
  }

  return json({error: "metode"}, 405);
};

export const config = { path: "/api/archive" };
