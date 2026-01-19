# Poptique Shopping List — Frontend on GitHub Pages or Vercel

This is the **frontend** for your Poptique Google Apps Script shopping list. It runs on **GitHub Pages** or **Vercel** and talks to your **Google Sheet** via an Apps Script Web App.

- **GitHub Pages:** You host the static site on GitHub; a small **proxy** (Vercel *or* Cloudflare Worker) is still needed so the browser can call Apps Script (CORS). No Vercel required if you use the Worker.
- **Vercel:** Hosts both the site and the proxy; no extra service.

**Features:** Poptique branding, list grouped by marketplace (eBay, Poshmark, Depop, Whatnot, Facebook Marketplace, Vinted), swipe right to edit platform / swipe left to delete, heart to toggle “Picked,” collapsible add form and platform cards, slide‑up sheet to change marketplace.

---

## What’s in this repo

| Path | Role |
|------|------|
| `index.html` | Main page (Poptique layout) |
| `main.js` | Logic, API calls, swipe, sheet |
| `styles.css` | Poptique purple theme and cards |
| `api/proxy.js` | Vercel serverless proxy (forwards to Apps Script and adds CORS) |
| `cloudflare-worker.js` | **Cloudflare Worker** proxy (use when you want GitHub Pages without Vercel) |
| `Code.gs` | **Copy this into Google Apps Script** — replaces your current `doGet` + exposes a JSON API |

---

## 1. Google Apps Script (backend)

1. Open your existing Apps Script project (the one tied to your Sheet).
2. Replace the contents of `Code.gs` with the `Code.gs` from this repo.
3. Make sure the **active sheet’s first row is a header**, e.g.:
   - `Product` | `Platform` | `Picked`
4. **Deploy as Web App**
   - **Deploy → New deployment** (or **Manage deployments → Edit → New version**)
   - **Execute as:** Me  
   - **Who has access:** **Anyone** or **Anyone, even anonymous**
   - Deploy and copy the **Web App URL** (ends with `/exec`).

---

## 2. GitHub Pages (frontend) + proxy (Vercel or Cloudflare Worker)

GitHub Pages serves only static files, so it **cannot** run the proxy. You need a separate proxy for the Apps Script API. Two options:

### Option A: GitHub Pages + Vercel (proxy only)

1. **Deploy this repo to Vercel** (only the proxy is used; you can ignore the Vercel-hosted site):
   - [vercel.com](https://vercel.com) → **Add New → Project** → import **emorale112/poptique-shopping-list**.
   - **Settings → Environment Variables:** `SCRIPT_URL` = your Apps Script `/exec` URL.
   - Deploy. Note the URL, e.g. `https://poptique-shopping-list-xxx.vercel.app`.

2. **Point the frontend at the proxy** — in `index.html`, **before** `<script src="main.js">`, uncomment and set:
   ```html
   <script>window.POPTIQUE_API_BASE = "https://YOUR_VERCEL_APP.vercel.app/api/proxy";</script>
   ```

3. **Enable GitHub Pages:**
   - Repo → **Settings → Pages**
   - **Source:** Deploy from a branch  
   - **Branch:** `main` (or `master`) — **/ (root)**  
   - Save. The site will be at `https://emorale112.github.io/poptique-shopping-list/`.

### Option B: GitHub Pages + Cloudflare Worker (no Vercel)

1. **Create a Cloudflare Worker:**
   - [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Create Worker**.
   - Name it (e.g. `poptique-proxy`). Replace the default script with the contents of **`cloudflare-worker.js`** from this repo.

2. **Set the Apps Script URL:**
   - In the Worker → **Settings** → **Variables and Secrets**
   - **Add variable:** `SCRIPT_URL` = your Apps Script `/exec` URL.  
   - Deploy.

3. **Copy the Worker URL** (e.g. `https://poptique-proxy.USER.workers.dev`). In `index.html`, before `main.js`:
   ```html
   <script>window.POPTIQUE_API_BASE = "https://YOUR_WORKER.workers.dev";</script>
   ```

4. **Enable GitHub Pages** as in Option A, step 3.

---

## 3. Vercel (frontend + proxy together)

If you prefer **not** to use GitHub Pages, deploy everything on Vercel:

- Import the repo on Vercel, set `SCRIPT_URL`, and deploy. The app at `https://your-project.vercel.app` will work with no changes (`API_BASE` stays `/api/proxy`).

---

## 4. Custom domain (e.g. picker.poptique.toys) with GitHub Pages

1. In the GitHub repo: **Settings → Pages → Custom domain** → enter `picker.poptique.toys` → **Save**.
2. In your DNS for **poptique.toys**, add:
   - **CNAME** — Name: `picker` — Target: `emorale112.github.io`  
   (GitHub may show a different target; use what it shows.)
3. Wait for DNS and GitHub’s SSL. The app will be at **https://picker.poptique.toys**.  
   The `window.POPTIQUE_API_BASE` you set in `index.html` still applies.

---

## 5. Run locally

- **With a deployed proxy (Vercel or Worker):**  
  - Uncomment and set `window.POPTIQUE_API_BASE` in `index.html` to your proxy URL.
  - Run `npx serve .` and open `http://localhost:3000`.

- **Without a proxy:** Requests to Apps Script will fail (CORS) unless you use a local CORS proxy.

---

## API (used by the frontend)

Your Apps Script is called like this via the proxy:

- **GET** `?action=getProducts`  
  - Returns an array of `[product, platform, picked]` (one per row, header skipped).

- **POST** with `Content-Type: text/plain` and JSON body, e.g.:
  - `{ "action": "addProduct", "product": "...", "platform": "..." }`
  - `{ "action": "updatePicked", "rowNumber": 2, "picked": true }`
  - `{ "action": "deleteRow", "rowNumber": 2 }`
  - `{ "action": "clearList" }`
  - `{ "action": "updatePlatform", "rowNumber": 2, "newPlatform": "..." }`
  - `{ "action": "markAllPicked", "platform": "..." }`
  - `{ "action": "markAllUnpicked", "platform": "..." }`

`Code.gs` in this repo implements these. The proxy only forwards requests and adds CORS; it does not change the JSON.

---

## Sheet and platforms

- **Header row:** Row 1 must be present (e.g. `Product`, `Platform`, `Picked`). Data starts at row 2.
- **Platforms:** The frontend uses: **eBay, Poshmark, Depop, Whatnot, Facebook Marketplace, Vinted.**  
  To change them, edit the `<select id="platform">` in `index.html` and the `PLATFORMS` array and `platformColors` in `main.js`.

---

## Troubleshooting

- **“SCRIPT_URL not configured”**  
  - Set `SCRIPT_URL` in Vercel (Environment Variables) or in the Cloudflare Worker (Variables and Secrets), then redeploy.

- **CORS / “Failed to fetch” from GitHub Pages**  
  - In `index.html`, before `main.js`, set  
    `window.POPTIQUE_API_BASE = "https://your-proxy.vercel.app/api/proxy"`  
    or  
    `window.POPTIQUE_API_BASE = "https://your-worker.workers.dev"`  
    (no trailing slash).

- **“Failed to load list” or empty list**  
  - Check that the Apps Script Web App is deployed with **Anyone** (or **Anyone, even anonymous**) and that the active sheet has a header row and optional data in row 2+.

- **Changes in `Code.gs` not applied**  
  - In Apps Script: **Deploy → Manage deployments → Edit → New version** (or create a new deployment) so the live Web App uses the new code.
