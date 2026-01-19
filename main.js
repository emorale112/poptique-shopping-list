/**
 * Poptique Shopping List – frontend
 *
 * API_BASE:
 * - '/api/proxy' when frontend and proxy are on the same host (e.g. Vercel)
 * - 'https://YOUR_VERCEL_APP.vercel.app/api/proxy' when frontend is on GitHub Pages and proxy on Vercel
 */
const API_BASE = "/api/proxy";

const PLATFORMS = ["eBay", "Poshmark", "Depop", "Whatnot", "Facebook Marketplace", "Vinted"];

const platformColors = {
  eBay: "#e6f2ff",
  Poshmark: "#f7e6f0",
  Depop: "#ffe6e6",
  Whatnot: "#fff8d9",
  "Facebook Marketplace": "#e6f0ff",
  Vinted: "#e6fff7",
};

const DEFAULT_PLATFORM_COLOR = "#f0e6ff";

// --- API ---
function getApiUrl() {
  if (API_BASE.startsWith("http") || API_BASE.startsWith("//")) return API_BASE.replace(/\/$/, "");
  return (window.location.origin + (API_BASE.startsWith("/") ? "" : "/") + API_BASE).replace(/\/$/, "");
}

function apiGet(action) {
  const url = getApiUrl() + "?action=" + encodeURIComponent(action);
  return fetch(url, { method: "GET" }).then((r) => {
    if (!r.ok) throw new Error(r.statusText || "Request failed");
    return r.json();
  });
}

function apiPost(body) {
  return fetch(getApiUrl(), {
    method: "POST",
    headers: { "Content-Type": "text/plain; charset=utf-8" },
    body: JSON.stringify(body),
  }).then((r) => {
    if (!r.ok) throw new Error(r.statusText || "Request failed");
    const ct = (r.headers.get("Content-Type") || "").toLowerCase();
    return ct.includes("json") ? r.json() : r.text().then(() => ({}));
  });
}

// --- DOM ---
const $ = (id) => document.getElementById(id);
const productInput = $("product");
const platformSelect = $("platform");
const addBtn = $("add-btn");
const refreshBtn = $("refresh-btn");
const clearBtn = $("clear-btn");
const formTitle = $("form-title");
const formSection = $("form-section");
const formChevron = $("form-chevron");
const groupedOutput = $("grouped-output");
const errorMsg = $("error-msg");
const loadingMsg = $("loading-msg");
const sheetBackdrop = $("sheet-backdrop");
const sheet = $("sheet");
const sheetOptions = $("sheet-options");
const sheetCancel = $("sheet-cancel");

let swipeData = {};
let editRow = null;
let sheetIsAnimating = false;

/** For JS strings in onclick etc. */
function esc(s) {
  return String(s)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");
}

/** For HTML text content (product, platform label). */
function htmlEsc(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

/** Safe for HTML id (no spaces, no quotes). */
function safeId(platform) {
  return "body-" + String(platform).replace(/[\s'"]/g, "-").replace(/[^a-zA-Z0-9-]/g, "");
}

function isPicked(val) {
  if (val === true || val === "true" || val === "TRUE") return true;
  if (val === false || val === "false" || val === "FALSE") return false;
  return Boolean(val);
}

function showError(msg) {
  errorMsg.textContent = msg || "Something went wrong.";
  errorMsg.hidden = false;
}

function clearError() {
  errorMsg.hidden = true;
}

function showLoading(show) {
  loadingMsg.hidden = !show;
}

// --- Form ---
function toggleForm() {
  const hidden = formSection.style.display === "none";
  formSection.style.display = hidden ? "block" : "none";
  formChevron.style.transform = hidden ? "rotate(0deg)" : "rotate(180deg)";
}

// --- List ---
function loadList() {
  clearError();
  showLoading(true);
  groupedOutput.innerHTML = "";

  apiGet("getProducts")
    .then((data) => {
      const rows = Array.isArray(data) ? data : [];
      displayGrouped(rows);
    })
    .catch((err) => {
      showError(err.message || "Failed to load list.");
    })
    .finally(() => {
      showLoading(false);
    });
}

function clearAll() {
  if (!confirm("Clear the entire list? This cannot be undone.")) return;
  clearBtn.disabled = true;
  apiPost({ action: "clearList" })
    .then(loadList)
    .catch((err) => showError(err.message))
    .finally(() => (clearBtn.disabled = false));
}

function displayGrouped(data) {
  const groups = {};
  data.forEach((row, index) => {
    const product = row[0];
    const platform = row[1] || "Other";
    const picked = isPicked(row[2]);
    const sheetRow = index + 2;
    if (!groups[platform]) groups[platform] = [];
    groups[platform].push({ product, picked, sheetRow });
  });

  Object.keys(groups).forEach((platform) => {
    groups[platform].sort((a, b) => {
      if (a.picked === b.picked) return (a.product || "").localeCompare(b.product || "");
      return a.picked ? 1 : -1;
    });
  });

  let html = "";
  Object.keys(groups).forEach((platform) => {
    const items = groups[platform];
    const bg = platformColors[platform] || DEFAULT_PLATFORM_COLOR;

    html += `
      <div class="platform-card" style="background:${bg}">
        <div class="platform-header" data-toggle-platform="${safeId(platform)}" onclick="toggleCard('${esc(platform)}')">
          <h3>${htmlEsc(platform)}</h3>
          <div class="toolbar">
            <span onclick="event.stopPropagation(); markAllPicked('${esc(platform)}')">Picked</span>
            <span onclick="event.stopPropagation(); markAllUnpicked('${esc(platform)}')">Unpicked</span>
          </div>
        </div>
        <div id="${safeId(platform)}">`;

    items.forEach((item) => {
      const heartPath = item.picked
        ? '<path d="M12 21c-3.5-3-6-5.5-6-9a6 6 0 0 1 12 0c0 3.5-2.5 6-6 9z" fill="#7a3db8" stroke="#7a3db8" stroke-width="2"/>'
        : '<path d="M12 21c-3.5-3-6-5.5-6-9a6 6 0 0 1 12 0c0 3.5-2.5 6-6 9z" fill="none" stroke="#7a3db8" stroke-width="2"/>';

      html += `
        <div class="swipe-row" id="row-${item.sheetRow}" data-sheet-row="${item.sheetRow}">
          <div class="swipe-content"
            ontouchstart="swipeStart(event, ${item.sheetRow})"
            ontouchmove="swipeMove(event, ${item.sheetRow})"
            ontouchend="swipeEnd(event, ${item.sheetRow})">
            <div style="display:flex; align-items:center;">
              ${item.picked ? '<span class="picked-badge">Picked</span>' : ""}
              <span>${htmlEsc(item.product)}</span>
            </div>
            <button type="button" class="heart-btn" onclick="togglePicked(${item.sheetRow}, ${!item.picked})">
              <svg class="heart-icon" viewBox="0 0 24 24">${heartPath}</svg>
            </button>
          </div>
          <div class="delete-indicator"></div>
        </div>`;
    });

    html += `</div></div>`;
  });

  groupedOutput.innerHTML = html;

  // Mouse: when mousedown on swipe-content, we need mousemove/mouseup on document so they fire outside the element
  groupedOutput.querySelectorAll(".swipe-content").forEach((el) => {
    const row = el.closest(".swipe-row");
    const id = parseInt(row.dataset.sheetRow, 10);

    el.addEventListener("mousedown", (e) => {
      swipeStart(e, id);
      const onMouseMove = (e2) => swipeMove(e2, id);
      const onMouseUp = (e2) => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        swipeEnd(e2, id);
      };
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
  });
}

function toggleCard(platform) {
  const body = document.getElementById(safeId(platform));
  if (!body) return;
  const hidden = body.style.display === "none";
  body.style.display = hidden ? "block" : "none";
}

function add() {
  const product = (productInput.value || "").trim();
  const platform = platformSelect.value || "eBay";
  if (!product) {
    showError("Enter a product name");
    return;
  }
  clearError();
  addBtn.disabled = true;
  apiPost({ action: "addProduct", product, platform })
    .then(() => {
      productInput.value = "";
      loadList();
    })
    .catch((err) => showError(err.message))
    .finally(() => (addBtn.disabled = false));
}

function togglePicked(rowNumber, newState) {
  apiPost({ action: "updatePicked", rowNumber, picked: newState }).then(loadList).catch((err) => showError(err.message));
}

function confirmDelete(rowNumber) {
  if (!confirm("Delete this item?")) return;

  const row = document.getElementById("row-" + rowNumber);
  if (row) row.classList.add("fade-out");

  setTimeout(() => {
    apiPost({ action: "deleteRow", rowNumber })
      .then(loadList)
      .catch((err) => showError(err.message));
  }, 300);
}

// --- Sheet: Edit Marketplace ---
function openSheet(rowNumber) {
  if (sheetIsAnimating) return;
  sheetIsAnimating = true;

  editRow = rowNumber;
  sheetOptions.innerHTML = PLATFORMS.map(
    (p) => `<button type="button" onclick="changeMarketplace('${p.replace(/'/g, "\\'")}')">${htmlEsc(p)}</button>`
  ).join("");

  sheetBackdrop.style.display = "block";
  requestAnimationFrame(() => {
    sheetBackdrop.classList.add("visible");
    sheet.classList.add("visible");
    setTimeout(() => (sheetIsAnimating = false), 300);
  });
}

function closeSheet() {
  if (sheetIsAnimating) return;
  sheetIsAnimating = true;

  sheet.classList.remove("visible");
  sheetBackdrop.classList.remove("visible");

  setTimeout(() => {
    if (!sheetBackdrop.classList.contains("visible")) {
      sheetBackdrop.style.display = "none";
    }
    sheetIsAnimating = false;
  }, 300);
}

function changeMarketplace(newPlatform) {
  apiPost({ action: "updatePlatform", rowNumber: editRow, newPlatform })
    .then(() => {
      loadList();
      closeSheet();
    })
    .catch((err) => showError(err.message));
}

function markAllPicked(platform) {
  apiPost({ action: "markAllPicked", platform }).then(loadList).catch((err) => showError(err.message));
}

function markAllUnpicked(platform) {
  apiPost({ action: "markAllUnpicked", platform }).then(loadList).catch((err) => showError(err.message));
}

// --- Swipe ---
function swipeStart(e, id) {
  const x = e.touches ? e.touches[0].clientX : e.clientX;
  swipeData[id] = { startX: x, lastX: x, swiping: false };
}

function swipeMove(e, id) {
  if (!swipeData[id]) return;

  const x = e.touches ? e.touches[0].clientX : e.clientX;
  const dx = x - swipeData[id].startX;
  swipeData[id].lastX = x;

  if (Math.abs(dx) > 10) swipeData[id].swiping = true;

  const content = document.querySelector("#row-" + id + " .swipe-content");
  const indicator = document.querySelector("#row-" + id + " .delete-indicator");
  if (!content) return;

  if (dx > 0) {
    content.style.transform = "translateX(" + Math.min(dx, 80) + "px)";
  } else {
    content.style.transform = "translateX(" + Math.max(dx, -80) + "px)";
    if (indicator) indicator.style.width = Math.min(80, Math.abs(dx)) + "px";
  }
}

function swipeEnd(e, id) {
  if (!swipeData[id]) return;

  const dx = swipeData[id].lastX - swipeData[id].startX;
  const content = document.querySelector("#row-" + id + " .swipe-content");
  const indicator = document.querySelector("#row-" + id + " .delete-indicator");

  if (dx > 60) {
    openSheet(id);
  } else if (dx < -60) {
    confirmDelete(id);
  }

  if (content) content.style.transform = "translateX(0)";
  if (indicator) indicator.style.width = "0";

  swipeData[id] = null;
}

// --- Expose for inline handlers ---
window.toggleCard = toggleCard;
window.markAllPicked = markAllPicked;
window.markAllUnpicked = markAllUnpicked;
window.togglePicked = togglePicked;
window.confirmDelete = confirmDelete;
window.changeMarketplace = changeMarketplace;
window.swipeStart = swipeStart;
window.swipeMove = swipeMove;
window.swipeEnd = swipeEnd;

// --- Init ---
formTitle.addEventListener("click", toggleForm);
addBtn.addEventListener("click", add);
refreshBtn.addEventListener("click", loadList);
clearBtn.addEventListener("click", clearAll);
sheetCancel.addEventListener("click", closeSheet);
sheetBackdrop.addEventListener("click", closeSheet);

productInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") add();
});

loadList();
