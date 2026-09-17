const config = window.SWJTU_MATH_CONFIG || {};
const state = {
  resources: [], category: "全部", type: "", query: "", visible: 18, user: null,
  previewToken: 0, objectUrl: null
};
const $ = (selector, root = document) => root.querySelector(selector);
const els = {
  grid: $("#resource-grid"), categories: $("#categories"), search: $("#search"), type: $("#type-filter"),
  result: $("#result-count"), more: $("#load-more"), preview: $("#preview-dialog"),
  previewTitle: $("#preview-title"), previewBody: $("#preview-body"), download: $("#preview-download"), upload: $("#upload-dialog")
};

const allowedUploads = new Set(["pdf", "jpg", "jpeg", "png", "webp", "md", "txt", "docx", "xlsx"]);
const scriptCache = new Map();
const safeUrl = (value) => String(value).split("/").map(encodeURIComponent).join("/");
const sizeLabel = (bytes = 0) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const resourceUrl = (item) => new URL(safeUrl(item.path), location.href).href;
const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
const normalized = (value = "") => String(value).normalize("NFC").trim().toLocaleLowerCase("zh-CN");
const previewKindOf = (item) => item.previewKind || ({
  pdf: "pdf", jpg: "image", jpeg: "image", png: "image", webp: "image",
  md: "text", txt: "text", m: "text", docx: "docx", xlsx: "xlsx"
}[normalized(item.extension)] || "none");
const mimeTypeOf = (extension) => ({
  pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
  md: "text/markdown;charset=utf-8", txt: "text/plain;charset=utf-8", m: "text/plain;charset=utf-8",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
}[normalized(extension)] || "application/octet-stream");

function filtered() {
  const needle = state.query.trim().toLocaleLowerCase("zh-CN");
  return state.resources.filter((item) =>
    (state.category === "全部" || normalized(item.category) === normalized(state.category)) &&
    (!state.type || normalized(item.extension) === normalized(state.type)) &&
    (!needle || `${item.title} ${item.category} ${item.description || ""} ${item.extension}`.toLocaleLowerCase("zh-CN").includes(needle))
  );
}

function renderResources() {
  const matches = filtered();
  const shown = matches.slice(0, state.visible);
  els.result.textContent = `找到 ${matches.length} 份资料`;
  els.more.hidden = shown.length >= matches.length;
  els.grid.innerHTML = shown.length ? shown.map((item) => {
    const previewable = previewKindOf(item) !== "none";
    return `
    <article class="resource-card">
      <div class="card-top"><span>${escapeHtml(item.category)}</span><span class="file-type">${escapeHtml(item.extension)}</span></div>
      <h3>${escapeHtml(item.title)}</h3>
      <p class="description">${escapeHtml(item.description || `${sizeLabel(item.size)} · ${previewable ? "点击预览或下载" : "点击下载原始资料"}`)}</p>
      <div class="card-actions">
        ${previewable ? `<button data-preview="${escapeHtml(item.id)}">预览</button>` : `<span class="disabled">暂不支持预览</span>`}
        <a href="${resourceUrl(item)}" download>下载</a>
        <button data-share="${escapeHtml(item.id)}">分享</button>
      </div>
    </article>`;
  }).join("") : `<p class="empty">没有找到匹配的资料，换个关键词试试。</p>`;
}

function renderFilters() {
  const categories = ["全部", ...new Set(state.resources.map((item) => item.category))];
  els.categories.innerHTML = categories.map((name) => `<button class="category${name === state.category ? " active" : ""}" data-category="${escapeHtml(name)}">${escapeHtml(name)}</button>`).join("");
  const types = [...new Set(state.resources.map((item) => item.extension))].sort();
  els.type.innerHTML = `<option value="">全部格式</option>${types.map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(type.toUpperCase())}</option>`).join("")}`;
  els.type.value = state.type;
  $("#upload-category").innerHTML = categories.filter((x) => x !== "全部").map((x) => `<option>${escapeHtml(x)}</option>`).join("") + `<option>其他资料</option>`;
  $("#resource-count").textContent = state.resources.length;
  $("#category-count").textContent = categories.length - 1;
}

function releaseObjectUrl() {
  if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
  state.objectUrl = null;
}

function showPreviewMessage(message, className = "preview-message") {
  els.previewBody.replaceChildren();
  const messageElement = document.createElement("p");
  messageElement.className = className;
  messageElement.textContent = message;
  els.previewBody.append(messageElement);
}

function loadScript(path, globalName) {
  if (window[globalName]) return Promise.resolve(window[globalName]);
  if (scriptCache.has(path)) return scriptCache.get(path);
  const promise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = new URL(path, location.href).href;
    script.async = true;
    script.onload = () => window[globalName] ? resolve(window[globalName]) : reject(new Error(`未找到 ${globalName}`));
    script.onerror = () => reject(new Error(`无法加载 ${path}`));
    document.head.append(script);
  });
  scriptCache.set(path, promise);
  return promise;
}

async function fetchBlob(url, extension) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`资料加载失败（${response.status}）`);
  const source = await response.blob();
  return new Blob([source], { type: mimeTypeOf(extension) });
}

async function renderBlobPreview(blob, title, extension, kind, token) {
  if (token !== state.previewToken) return;
  if (kind === "pdf") {
    releaseObjectUrl();
    state.objectUrl = URL.createObjectURL(blob);
    const frame = document.createElement("iframe");
    frame.src = `${state.objectUrl}#toolbar=1`;
    frame.title = title;
    els.previewBody.replaceChildren(frame);
    return;
  }
  if (kind === "image") {
    releaseObjectUrl();
    state.objectUrl = URL.createObjectURL(blob);
    const image = document.createElement("img");
    image.src = state.objectUrl;
    image.alt = title;
    els.previewBody.replaceChildren(image);
    return;
  }
  if (kind === "text") {
    const text = document.createElement("pre");
    text.textContent = await blob.text();
    if (token !== state.previewToken) return;
    els.previewBody.replaceChildren(text);
    return;
  }
  if (kind === "docx") {
    const docx = await loadScript("./vendor/jszip.min.js", "JSZip").then(() => loadScript("./vendor/docx-preview.min.js", "docx"));
    if (token !== state.previewToken) return;
    const wrapper = document.createElement("div");
    wrapper.className = "docx-preview";
    const styleHost = document.createElement("div");
    const documentHost = document.createElement("div");
    documentHost.className = "docx-document";
    wrapper.append(styleHost, documentHost);
    els.previewBody.replaceChildren(wrapper);
    await docx.renderAsync(blob, documentHost, styleHost, { debug: false, renderAltChunks: false });
    return;
  }
  if (kind === "xlsx") {
    const XLSX = await loadScript("./vendor/xlsx.full.min.js", "XLSX");
    if (token !== state.previewToken) return;
    await renderWorkbook(XLSX, blob, token);
    return;
  }
  showPreviewMessage("此文件暂不支持在线预览，请下载后查看。", "preview-error");
}

async function renderWorkbook(XLSX, blob, token) {
  const workbook = XLSX.read(await blob.arrayBuffer(), { type: "array", cellDates: true });
  if (!workbook.SheetNames.length) throw new Error("工作簿中没有可显示的工作表。");
  const wrapper = document.createElement("div");
  wrapper.className = "spreadsheet-preview";
  const tabs = document.createElement("div");
  tabs.className = "sheet-tabs";
  const tableHost = document.createElement("div");
  tableHost.className = "sheet-table-wrap";
  const note = document.createElement("p");
  note.className = "spreadsheet-note";
  wrapper.append(tabs, tableHost, note);
  els.previewBody.replaceChildren(wrapper);

  const renderSheet = (sheetIndex) => {
    if (token !== state.previewToken) return;
    tabs.querySelectorAll(".sheet-tab").forEach((tab, index) => tab.classList.toggle("active", index === sheetIndex));
    const sheet = workbook.Sheets[workbook.SheetNames[sheetIndex]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "", blankrows: false });
    const visibleRows = rows.slice(0, 500);
    const columnCount = Math.min(50, visibleRows.reduce((max, row) => Math.max(max, row.length), 0));
    tableHost.replaceChildren();
    if (!columnCount || !visibleRows.length) {
      const empty = document.createElement("p");
      empty.className = "preview-message";
      empty.textContent = "这个工作表没有可显示的数据。";
      tableHost.append(empty);
      note.textContent = `当前工作表：${workbook.SheetNames[sheetIndex]}`;
      return;
    }
    const table = document.createElement("table");
    table.className = "spreadsheet-table";
    const header = document.createElement("tr");
    const corner = document.createElement("th");
    corner.textContent = "#";
    header.append(corner);
    for (let column = 0; column < columnCount; column++) {
      const cell = document.createElement("th");
      cell.textContent = columnLabel(column);
      header.append(cell);
    }
    const thead = document.createElement("thead");
    thead.append(header);
    table.append(thead);
    const tbody = document.createElement("tbody");
    visibleRows.forEach((row, rowIndex) => {
      const line = document.createElement("tr");
      const rowNumber = document.createElement("th");
      rowNumber.textContent = String(rowIndex + 1);
      line.append(rowNumber);
      for (let column = 0; column < columnCount; column++) {
        const cell = document.createElement("td");
        cell.textContent = row[column] == null ? "" : String(row[column]);
        line.append(cell);
      }
      tbody.append(line);
    });
    table.append(tbody);
    tableHost.append(table);
    note.textContent = `当前工作表：${workbook.SheetNames[sheetIndex]} · 预览前 ${visibleRows.length} 行、${columnCount} 列`;
    if (rows.length > visibleRows.length || rows.some((row) => row.length > columnCount)) note.textContent += "，完整内容请下载原文件";
  };

  workbook.SheetNames.forEach((name, index) => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "sheet-tab";
    tab.textContent = name;
    tab.addEventListener("click", () => renderSheet(index));
    tabs.append(tab);
  });
  renderSheet(0);
}

function columnLabel(index) {
  let value = "";
  for (let number = index + 1; number > 0; number = Math.floor((number - 1) / 26)) value = String.fromCharCode(65 + ((number - 1) % 26)) + value;
  return value;
}

async function preview(item) {
  if (!item) return;
  const token = ++state.previewToken;
  releaseObjectUrl();
  const kind = previewKindOf(item);
  els.previewTitle.textContent = item.title;
  els.download.href = resourceUrl(item);
  showPreviewMessage("正在加载预览…");
  if (!els.preview.open) els.preview.showModal();
  try {
    const blob = await fetchBlob(resourceUrl(item), item.extension);
    await renderBlobPreview(blob, item.title, item.extension, kind, token);
  } catch (error) {
    if (token !== state.previewToken) return;
    showPreviewMessage(`${error.message || "预览加载失败"}，请下载原文件查看。`, "preview-error");
  }
}

async function share(item) {
  const url = `${location.origin}${location.pathname}#resource=${encodeURIComponent(item.id)}`;
  try {
    if (navigator.share) await navigator.share({ title: item.title, url });
    else { await navigator.clipboard.writeText(url); alert("分享链接已复制"); }
  } catch (error) { if (error.name !== "AbortError") alert("复制失败，请手动复制当前地址"); }
}

async function loadAuth() {
  const api = config.apiBase?.replace(/\/$/, "");
  if (!api) { $("#upload-unavailable").hidden = false; $("#github-login").hidden = true; return; }
  $("#github-login").href = `${api}/auth/github?return_to=${encodeURIComponent(location.href)}`;
  try {
    const response = await fetch(`${api}/api/me`, { credentials: "include" });
    if (!response.ok) return;
    state.user = await response.json();
    $("#auth-panel").hidden = true; $("#upload-form").hidden = false;
    $("#signed-user").textContent = `已登录：@${state.user.login}`;
  } catch { $("#upload-unavailable").hidden = false; }
}

async function submitUpload(event) {
  event.preventDefault();
  const form = event.currentTarget; const status = $("#upload-status"); const button = $("button[type=submit]", form);
  const file = form.file.files[0];
  const extension = file?.name.split(".").pop().toLowerCase();
  if (!file || !allowedUploads.has(extension)) { status.textContent = "请选择支持的 PDF、图片、Markdown、TXT、DOCX 或 XLSX 文件。"; return; }
  if (file.size > 10 * 1024 * 1024) { status.textContent = "文件不能超过10MB。"; return; }
  button.disabled = true; status.textContent = "正在上传并提交到资料库…";
  try {
    const response = await fetch(`${config.apiBase.replace(/\/$/, "")}/api/upload`, { method: "POST", body: new FormData(form), credentials: "include" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "上传失败");
    status.textContent = "上传成功，网站将在构建完成后自动显示该资料。"; form.reset();
  } catch (error) { status.textContent = error.message; }
  finally { button.disabled = false; }
}

document.addEventListener("click", (event) => {
  const category = event.target.closest("[data-category]");
  if (category) { state.category = category.dataset.category; state.visible = 18; renderFilters(); renderResources(); return; }
  const previewButton = event.target.closest("[data-preview]");
  if (previewButton) { preview(state.resources.find((item) => item.id === previewButton.dataset.preview)); return; }
  const shareButton = event.target.closest("[data-share]");
  if (shareButton) { share(state.resources.find((item) => item.id === shareButton.dataset.share)); return; }
  if (event.target.closest("[data-open-upload],#upload-entry")) { els.upload.showModal(); return; }
  if (event.target.closest("[data-close]")) event.target.closest("dialog").close();
});
els.search.addEventListener("input", (event) => { state.query = event.target.value; state.visible = 18; renderResources(); });
els.type.addEventListener("change", (event) => { state.type = event.target.value; state.visible = 18; renderResources(); });
els.more.addEventListener("click", () => { state.visible += 18; renderResources(); });
$("#upload-form").addEventListener("submit", submitUpload);
els.preview.addEventListener("close", () => { state.previewToken++; releaseObjectUrl(); els.previewBody.replaceChildren(); });
document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !/input|textarea|select/i.test(document.activeElement?.tagName || "")) { event.preventDefault(); els.search.focus(); }
});

fetch(`./resources.json?v=${Date.now()}`, { cache: "no-store" }).then((response) => response.json()).then((data) => {
  state.resources = data.resources || []; renderFilters(); renderResources();
  const id = new URLSearchParams(location.hash.slice(1)).get("resource");
  const item = state.resources.find((resource) => resource.id === id);
  if (item) {
    state.query = item.title; els.search.value = item.title; renderResources();
    $("#library").scrollIntoView();
    if (previewKindOf(item) !== "none") preview(item);
  }
}).catch(() => { els.grid.innerHTML = `<p class="empty">资料索引加载失败，请稍后再试。</p>`; });
loadAuth();
