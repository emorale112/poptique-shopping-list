/**
 * Vercel serverless proxy: forwards requests to your Google Apps Script Web App
 * and adds CORS headers so the frontend on GitHub Pages (or any origin) can call it.
 *
 * Set SCRIPT_URL in Vercel: Project → Settings → Environment Variables
 * Example: https://script.google.com/macros/s/.../exec
 */

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const base = process.env.SCRIPT_URL;
  if (!base) {
    res.status(500).setHeader("Content-Type", "application/json").end(JSON.stringify({ error: "SCRIPT_URL not configured" }));
    return;
  }

  try {
    if (req.method === "GET") {
      const qs = (req.url || "").indexOf("?") >= 0 ? req.url.slice(req.url.indexOf("?")) : "";
      const url = base + qs;
      const r = await fetch(url, { method: "GET" });
      const text = await r.text();
      res.status(r.status).setHeader("Content-Type", r.headers.get("Content-Type") || "application/json").end(text);
      return;
    }

    if (req.method === "POST") {
      // Vercel parses text/plain as string in req.body
      const body = typeof req.body === "string" ? req.body : (req.body != null ? JSON.stringify(req.body) : "");
      const r = await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        body,
      });
      const text = await r.text();
      res.status(r.status).setHeader("Content-Type", r.headers.get("Content-Type") || "application/json").end(text);
      return;
    }

    res.status(405).setHeader("Content-Type", "application/json").end(JSON.stringify({ error: "Method not allowed" }));
  } catch (e) {
    res.status(500).setHeader("Content-Type", "application/json").end(JSON.stringify({ error: String(e.message || e) }));
  }
}
