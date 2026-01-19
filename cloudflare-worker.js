/**
 * Cloudflare Worker: proxy to Google Apps Script (for use with GitHub Pages).
 *
 * 1. In Cloudflare: Workers & Pages → Create Worker → paste this as the script.
 * 2. Settings → Variables and Secrets: add SCRIPT_URL = your Apps Script /exec URL.
 * 3. Deploy. Your Worker URL (e.g. https://poptique-proxy.USER.workers.dev) is API_BASE.
 */

export default {
  async fetch(request, env, ctx) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const SCRIPT_URL = env.SCRIPT_URL;
    if (!SCRIPT_URL) {
      return new Response(JSON.stringify({ error: "SCRIPT_URL not configured" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    try {
      const url = new URL(request.url);

      if (request.method === "GET") {
        const qs = url.search;
        const r = await fetch(SCRIPT_URL + qs, { method: "GET" });
        const text = await r.text();
        return new Response(text, {
          status: r.status,
          headers: { ...cors, "Content-Type": r.headers.get("Content-Type") || "application/json" },
        });
      }

      if (request.method === "POST") {
        const body = await request.text();
        const r = await fetch(SCRIPT_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain; charset=utf-8" },
          body,
        });
        const text = await r.text();
        return new Response(text, {
          status: r.status,
          headers: { ...cors, "Content-Type": r.headers.get("Content-Type") || "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e.message || e) }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
  },
};
