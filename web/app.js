const config = window.SWJTU_MATH_CONFIG || {};
const state = { resources: [], category: "全部", type: "", query: "", visible: 18, user: null };
const $ = (selector, root = document) => root.querySelector(selector);
const els = {
  grid: $("#resource-grid"), categories: $("#categories"), search: $("#search"), type: $("#type-filter"),
  result: $("#result-count"), more: $("#load-more"), preview: $("#preview-dialog"), upload: $("#upload-dialog")
};

const safeUrl = (value) => value.split("/").map(encodeURIComponent).join("/");
const sizeLabel = (bytes = 0) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const resourceUrl = (item) => new URL(safeUrl(item.path), location.href).href;
const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);

function filtered() {
  const needle = state.query.trim().toLocaleLowerCase("zh-CN");
  return state.resources.filter((item) =>
    (state.category === "全部" || item.category === state.category) &&
    (!state.type || item.extension === state.type) &&
    (!needle || `${item.title} ${item.category} ${item.description || ""} ${item.extension}`.toLocaleLowerCase("zh-CN").includes(needle))
  );
}

function renderResources() {
  const matches = filtered();
  const shown = matches.slice(0, state.visible);
  els.result.textContent = `找到 ${matches.length} 份资料`;
  els.more.hidden = shown.length >= matches.length;
  els.grid.innerHTML = shown.length ? shown.map((item) => `
    <article class="resource-card">
      <div class="card-top"><span>${escapeHtml(item.category)}</span><span class="file-type">${escapeHtml(item.extension)}</span></div>
      <h3>${escapeHtml(item.title)}</h3>
      <p class="description">${escapeHtml(item.description || `${sizeLabel(item.size)} · 点击下载原始资料`)}</p>
      <div class="card-actions">
        ${item.previewable ? `<button data-preview="${escapeHtml(item.id)}">预览</button>` : `<span class="disabled">暂不支持预览</span>`}
        <a href="${resourceUrl(item)}" download>下载</a>
        <button data-share="${escapeHtml(item.id)}">分享</button>
      </div>
    </article>`).join("") : `<p class="empty">没有找到匹配的资料，换个关键词试试。</p>`;
}

function renderFilters() {
  const categories = ["全部", ...new Set(state.resources.map((item) => item.category))];
  els.categories.innerHTML = categories.map((name) => `<button class="category${name === state.category ? " active" : ""}" data-category="${escapeHtml(name)}">${escapeHtml(name)}</button>`).join("");
  const types = [...new Set(state.resources.map((item) => item.extension))].sort();
  els.type.innerHTML = `<option value="">全部格式</option>${types.map((type) => `<option value="${type}">${type.toUpperCase()}</option>`).join("")}`;
  $("#upload-category").innerHTML = categories.filter((x) => x !== "全部").map((x) => `<option>${escapeHtml(x)}</option>`).join("") + `<option>其他资料</option>`;
  $("#resource-count").textContent = state.resources.length;
  $("#category-count").textContent = categories.length - 1;
}

async function preview(item) {
  const url = resourceUrl(item);
  $("#preview-title").textContent = item.title;
  $("#preview-download").href = url;
  const body = $("#preview-body");
  if (item.extension === "pdf") body.innerHTML = `<iframe src="${url}#toolbar=1" title="${escapeHtml(item.title)}"></iframe>`;
  else if (["jpg", "jpeg", "png", "webp"].includes(item.extension)) body.innerHTML = `<img src="${url}" alt="${escapeHtml(item.title)}">`;
  else {
    body.innerHTML = `<p>正在加载文本…</p>`;
    try { body.innerHTML = `<pre>${escapeHtml(await (await fetch(url)).text())}</pre>`; }
    catch { body.innerHTML = `<p>预览加载失败，请下载后查看。</p>`; }
  }
  els.preview.showModal();
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
  if (!file || file.size > 10 * 1024 * 1024) { status.textContent = "文件不能超过10MB。"; return; }
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
  if (category) { state.category = category.dataset.category; state.visible = 18; renderFilters(); renderResources(); }
  const previewButton = event.target.closest("[data-preview]");
  if (previewButton) preview(state.resources.find((x) => x.id === previewButton.dataset.preview));
  const shareButton = event.target.closest("[data-share]");
  if (shareButton) share(state.resources.find((x) => x.id === shareButton.dataset.share));
  if (event.target.closest("[data-open-upload],#upload-entry")) els.upload.showModal();
  if (event.target.closest("[data-close]")) event.target.closest("dialog").close();
});
els.search.addEventListener("input", (event) => { state.query = event.target.value; state.visible = 18; renderResources(); });
els.type.addEventListener("change", (event) => { state.type = event.target.value; state.visible = 18; renderResources(); });
els.more.addEventListener("click", () => { state.visible += 18; renderResources(); });
$("#upload-form").addEventListener("submit", submitUpload);
document.addEventListener("keydown", (event) => { if (event.key === "/" && !/input|textarea/i.test(document.activeElement.tagName)) { event.preventDefault(); els.search.focus(); } });

fetch("./resources.json").then((response) => response.json()).then((data) => {
  state.resources = data.resources; renderFilters(); renderResources();
  const id = new URLSearchParams(location.hash.slice(1)).get("resource");
  const item = state.resources.find((x) => x.id === id);
  if (item) {
    state.query = item.title; els.search.value = item.title; renderResources();
    document.querySelector("#library").scrollIntoView();
    if (item.previewable) preview(item);
  }
}).catch(() => { els.grid.innerHTML = `<p class="empty">资料索引加载失败，请稍后再试。</p>`; });
loadAuth();
