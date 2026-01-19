# Poptique Shopping List — Frontend on GitHub / Vercel

This is the **frontend** for your Poptique Google Apps Script shopping list. It runs on **GitHub Pages** or **Vercel** and talks to your **Google Sheet** via an Apps Script Web App. A small **Vercel serverless proxy** is used so the browser can call the script from another origin (CORS).

**Features:** Poptique branding, list grouped by marketplace (eBay, Poshmark, Depop, Whatnot, Facebook Marketplace, Vinted), swipe right to edit platform / swipe left to delete, heart to toggle “Picked,” collapsible add form and platform cards, slide‑up sheet to change marketplace.

---

## What’s in this repo

| Path | Role |
|------|------|
| `index.html` | Main page (Poptique layout) |
| `main.js` | Logic, API calls, swipe, sheet |
| `styles.css` | Poptique purple theme and cards |
| `api/proxy.js` | Vercel serverless proxy (forwards to Apps Script and adds CORS) |
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

## 2. Deploy frontend + proxy on Vercel (recommended)

This serves both the HTML/JS/CSS and the `/api/proxy` that calls your Apps Script.

1. **Push this project to GitHub** (or connect an existing repo to Vercel).

2. **Import the project in Vercel**
   - [vercel.com](https://vercel.com) → **Add New → Project** → choose the repo.  
   - **Root Directory:** leave as `.` (or the folder that contains `index.html` and `api/`).  
   - **Framework Preset:** Other (or leave default).  
   - Deploy (you can change env in the next step).

3. **Set the Apps Script URL**
   - Project → **Settings → Environment Variables**
   - Name: `SCRIPT_URL`  
   - Value: your Web App URL, e.g.  
     `https://script.google.com/macros/s/.../exec`  
   - **Save**, then **Redeploy** the project.

4. Open the Vercel URL (e.g. `https://your-project.vercel.app`).  
   The app uses `/api/proxy` by default, so it will work without any code changes.

---

## 3. Optional: frontend only on GitHub Pages

If you prefer to host **only** the static frontend on GitHub Pages and keep the proxy on Vercel:

1. Deploy the **whole repo** (including `api/proxy.js`) to **Vercel** as above and add `SCRIPT_URL`.
2. In `main.js`, set:
   ```js
   const API_BASE = "https://YOUR_VERCEL_APP.vercel.app/api/proxy";
   ```
3. In your **GitHub Pages** repo, use only:
   - `index.html`
   - `main.js`
   - `styles.css`  
   (No `api/` folder — GitHub Pages can’t run serverless functions.)
4. Publish the site (e.g. from `main` or `gh-pages`).

The frontend on GitHub Pages will call your Vercel proxy, which forwards to Apps Script.

---

## 4. Run locally

- **Without proxy** (will hit CORS when calling Apps Script from `file://` or `localhost`):  
  - Serve the folder with a simple static server, e.g.  
    `npx serve .`  
    and open `http://localhost:3000`.  
  - You’ll need to either use the Vercel proxy or a local CORS proxy for the API to work.

- **With Vercel proxy** (e.g. already deployed):  
  - Run `npx serve .` and in `main.js` temporarily set  
    `const API_BASE = "https://YOUR_VERCEL_APP.vercel.app/api/proxy";`  
  - Then open `http://localhost:3000`.

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
  - Set `SCRIPT_URL` in Vercel (Settings → Environment Variables) and redeploy.

- **CORS / “Failed to fetch” from GitHub Pages**  
  - Use the Vercel proxy and set `API_BASE` in `main.js` to  
    `https://YOUR_VERCEL_APP.vercel.app/api/proxy`.

- **“Failed to load list” or empty list**  
  - Check that the Apps Script Web App is deployed with **Anyone** (or **Anyone, even anonymous**) and that the active sheet has a header row and optional data in row 2+.

- **Changes in `Code.gs` not applied**  
  - In Apps Script: **Deploy → Manage deployments → Edit → New version** (or create a new deployment) so the live Web App uses the new code.
