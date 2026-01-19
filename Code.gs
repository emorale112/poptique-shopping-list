/**
 * Shopping List – API backend for use with GitHub/Vercel frontend
 *
 * Deploy as Web App: Execute as "Me", Who has access: "Anyone" or "Anyone, even anonymous"
 * Use the /exec URL as your API endpoint. For cross-origin (GitHub Pages), use the
 * Vercel proxy (see /api/proxy.js) or you will hit CORS.
 */

function doGet(e) {
  const action = e?.parameter?.action || "";
  if (action === "getProducts") {
    return jsonResponse(getProducts());
  }
  return jsonResponse({
    info: "Shopping List API. Use ?action=getProducts for GET. POST with JSON body for mutations.",
  });
}

function doPost(e) {
  let body;
  try {
    const raw = e?.postData?.contents || "{}";
    body = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch (err) {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const action = body.action;
  if (!action) return jsonResponse({ error: "Missing action" }, 400);

  try {
    switch (action) {
      case "addProduct":
        addProduct(body.product, body.platform);
        return jsonResponse({ ok: true });
      case "updatePicked":
        updatePicked(Number(body.rowNumber), !!body.picked);
        return jsonResponse({ ok: true });
      case "deleteRow":
        deleteRow(Number(body.rowNumber));
        return jsonResponse({ ok: true });
      case "clearList":
        clearList();
        return jsonResponse({ ok: true });
      case "updatePlatform":
        updatePlatform(Number(body.rowNumber), body.newPlatform);
        return jsonResponse({ ok: true });
      case "markAllPicked":
        markAllPicked(body.platform);
        return jsonResponse({ ok: true });
      case "markAllUnpicked":
        markAllUnpicked(body.platform);
        return jsonResponse({ ok: true });
      default:
        return jsonResponse({ error: "Unknown action: " + action }, 400);
    }
  } catch (err) {
    return jsonResponse({ error: String(err && err.message ? err.message : err) }, 500);
  }
}

function jsonResponse(data, statusCode) {
  const code = statusCode || 200;
  const output = ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  // Note: Apps Script does not allow setting Access-Control-Allow-Origin.
  // Use the /api/proxy on Vercel when calling from GitHub Pages or other origins.
  return output;
}

// ——— your existing sheet logic (unchanged) ———

function getProducts() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  return sheet.getDataRange().getValues().slice(1);
}

function addProduct(product, platform) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.appendRow([product, platform, false]);
}

function updatePicked(rowNumber, picked) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.getRange(rowNumber, 3).setValue(picked);
}

function deleteRow(rowNumber) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.deleteRow(rowNumber);
}

function clearList() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const last = sheet.getLastRow();
  if (last > 1) {
    sheet.deleteRows(2, last - 1);
  }
}

function updatePlatform(rowNumber, newPlatform) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.getRange(rowNumber, 2).setValue(newPlatform);
}

function markAllPicked(platform) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === platform) {
      sheet.getRange(i + 1, 3).setValue(true);
    }
  }
}

function markAllUnpicked(platform) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === platform) {
      sheet.getRange(i + 1, 3).setValue(false);
    }
  }
}
