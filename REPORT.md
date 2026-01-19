# Poptique Shopping List — Project Report

## Overview

Web app that collects product entries from a form, stores them in a **Google Sheet**, and shows an **up-to-date list** on the page. The frontend runs on **GitHub** or **Vercel**; the backend stays in **Google Apps Script** and reads/writes a spreadsheet.

---

## Data Flow

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│  Form (web)     │────▶│  Vercel      │────▶│  Apps Script    │────▶│  Google      │
│  Product +      │     │  /api/proxy  │     │  doGet/doPost   │     │  Sheet       │
│  Platform       │     │  (CORS)      │     │  getProducts,   │     │  A: Product  │
│                 │     │              │     │  addProduct,    │     │  B: Platform │
└─────────────────┘     └──────────────┘     │  updatePicked,  │     │  C: Picked   │
        │                       │            │  deleteRow,     │     └──────────────┘
        │                       │            │  clearList,     │              │
        │                       │            │  updatePlatform,│              │
        │                       │            │  markAll*   │              │
        │                       │            └────────┬────────┘              │
        │                       │                     │                        │
        ▼                       ▼                     ▼                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  List on the page (grouped by platform, swipe to edit/delete, heart = picked)   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

1. **Form** – User enters Product name and Platform (eBay, Poshmark, Depop, Whatnot, Facebook Marketplace, Vinted), clicks **Add Product** (or Enter).
2. **Frontend** – Sends `POST { action: "addProduct", product, platform }` to `/api/proxy`.
3. **Proxy** – Forwards to the Apps Script Web App URL; adds CORS headers.
4. **Apps Script** – `addProduct(product, platform)` appends a row: `[product, platform, false]`.
5. **Sheet** – New row appears in the active sheet (header in row 1; data from row 2).
6. **List refresh** – Frontend calls `loadList()` → `GET ?action=getProducts` → `getProducts()` returns all data → `displayGrouped()` re-renders the list.

---

## Project Structure

| File / Folder      | Purpose |
|--------------------|---------|
| `index.html`       | Poptique layout: header, Add Product card, Product List, Edit sheet. |
| `main.js`          | Form handling, `loadList`/`displayGrouped`, API calls, swipe, sheet, `toggleCard`/`markAll*`. |
| `styles.css`       | Purple theme, cards, platform colors, swipe rows, sheet/backdrop. |
| `api/proxy.js`     | Vercel serverless: forwards GET/POST to `SCRIPT_URL`, sets CORS. |
| `Code.gs`          | Apps Script: `doGet`/`doPost` JSON API + `getProducts`, `addProduct`, `updatePicked`, `deleteRow`, `clearList`, `updatePlatform`, `markAllPicked`, `markAllUnpicked`. |
| `README.md`        | Setup, deployment (Apps Script, Vercel, GitHub Pages), env, troubleshooting. |
| `.gitignore`       | `.DS_Store`, `node_modules/`. |
| `REPORT.md`        | This report. |

---

## Form → Sheet → List (Detail)

### Form fields

- **Product Name** – `#product`, required.
- **Platform** – `#platform` &lt;select&gt;: eBay, Poshmark, Depop, Whatnot, Facebook Marketplace, Vinted.

### Sheet columns (Row 1 = header)

| A       | B        | C       |
|---------|----------|---------|
| Product | Platform | Picked  |

- `addProduct` appends `[product, platform, false]`.
- `getProducts` returns `getDataRange().getValues().slice(1)` (skips header).

### List on the page

- **Grouped by platform** – Each platform is a collapsible card with its own color.
- **Per row:** product name, “Picked” badge when checked, heart to toggle picked.
- **Swipe right** – Opens “Edit Marketplace” sheet to change platform.
- **Swipe left** – Delete with confirm and fade-out.
- **Toolbar** – “Picked” / “Unpicked” to mark all in that platform.
- **Refresh** – Reloads from sheet. **Clear List** – Deletes all data rows (keeps header).

---

## Deployment

### 1. Google Apps Script

- Paste `Code.gs` into your Apps Script project (bound to the target sheet).
- **Deploy → New deployment** (or **Manage → Edit → New version**): **Execute as: Me**, **Who has access: Anyone** (or **Anyone, even anonymous**).
- Copy the Web App URL (ends with `/exec`).

### 2. Vercel (frontend + proxy)

- Import this repo in Vercel.
- **Environment variable:** `SCRIPT_URL` = the Apps Script `/exec` URL.
- Deploy. The site is served from the repo root; `/api/proxy` runs `api/proxy.js`.

### 3. `main.js` config

- Same host as proxy (e.g. Vercel):  
  `const API_BASE = "/api/proxy";`
- Frontend on GitHub Pages, proxy on Vercel:  
  `const API_BASE = "https://YOUR_VERCEL_APP.vercel.app/api/proxy";`

---

## API (Used by the Frontend)

| Method | Query / Body | Apps Script | Effect |
|--------|--------------|-------------|--------|
| GET    | `?action=getProducts` | `getProducts()` | Returns `[[product, platform, picked], ...]`. |
| POST   | `{ action: "addProduct", product, platform }` | `addProduct` | Appends one row. |
| POST   | `{ action: "updatePicked", rowNumber, picked }` | `updatePicked` | Sets Picked (col C). |
| POST   | `{ action: "deleteRow", rowNumber }` | `deleteRow` | Deletes that row. |
| POST   | `{ action: "clearList" }` | `clearList` | Deletes all data rows (keeps header). |
| POST   | `{ action: "updatePlatform", rowNumber, newPlatform }` | `updatePlatform` | Sets Platform (col B). |
| POST   | `{ action: "markAllPicked", platform }` | `markAllPicked` | Picked=true for that platform. |
| POST   | `{ action: "markAllUnpicked", platform }` | `markAllUnpicked` | Picked=false for that platform. |

---

## Dependencies

- **Frontend:** None (vanilla HTML/CSS/JS). Logo from:  
  `https://raw.githubusercontent.com/emorale112/inventory/main/poptiqueTextLogo.png`
- **Proxy:** Vercel serverless (Node, `fetch`). Needs `SCRIPT_URL` in the project.
- **Backend:** Google Apps Script (SpreadsheetApp, ContentService).

---

## Summary

The app **takes form input (Product + Platform), writes it to a Google Sheet via Apps Script, and refreshes the on-page list** from that sheet. The form and list are the same Poptique UI; the proxy is only to call Apps Script from a different origin (e.g. GitHub or Vercel) without CORS errors.
