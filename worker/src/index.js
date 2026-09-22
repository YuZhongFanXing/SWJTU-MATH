const MAX_FILE_SIZE = 10 * 1024 * 1024;
const DAILY_UPLOADS = 3;
const ALLOWED = new Set(["pdf", "jpg", "jpeg", "png", "webp", "md", "txt", "docx", "xlsx"]);

export default {
  async fetch(request, env) {
    try {
      if (request.method === "OPTIONS") return cors(new Response(null, { status: 204 }), request, env);
      const url = new URL(request.url);
      let response;
      if (url.pathname === "/auth/github" && request.method === "GET") response = await beginAuth(request, env);
      else if (url.pathname === "/auth/callback" && request.method === "GET") response = await finishAuth(request, env);
      else if (url.pathname === "/api/me" && request.method === "GET") response = await currentUser(request, env);
      else if (url.pathname === "/api/upload" && request.method === "POST") response = await upload(request, env);
      else if (url.pathname === "/health") response = json({ ok: true });
      else response = json({ error: "Not found" }, 404);
      return cors(response, request, env);
    } catch (error) {
      console.error(error);
      return cors(json({ error: error.publicMessage || "服务暂时不可用，请稍后再试。" }, error.status || 500), request, env);
    }
  }
};

async function beginAuth(request, env) {
  const url = new URL(request.url);
  const state = crypto.randomUUID();
  const requestedReturn = url.searchParams.get("return_to") || env.FRONTEND_ORIGIN;
  const returnTo = new URL(requestedReturn).origin === new URL(env.FRONTEND_ORIGIN).origin ? requestedReturn : env.FRONTEND_ORIGIN;
  const oauthCookie = await signedValue({ state, returnTo, exp: Date.now() + 600_000 }, env.SESSION_SECRET);
  const callback = `${url.origin}/auth/callback`;
  const destination = new URL("https://github.com/login/oauth/authorize");
  destination.searchParams.set("client_id", env.GITHUB_OAUTH_CLIENT_ID);
  destination.searchParams.set("redirect_uri", callback);
  destination.searchParams.set("scope", "read:user");
  destination.searchParams.set("state", state);
  return new Response(null, { status: 302, headers: { Location: destination.toString(), "Set-Cookie": cookie("swjtu_oauth", oauthCookie, 600) } });
}

async function finishAuth(request, env) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const saved = await verifiedValue(parseCookies(request.headers.get("cookie") || "").swjtu_oauth, env.SESSION_SECRET);
  if (!saved || saved.state !== state || saved.exp < Date.now() || !url.searchParams.get("code")) throw httpError(400, "GitHub登录状态已过期，请重新登录。");
  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", "User-Agent": "SWJTU-MATH" },
    body: JSON.stringify({ client_id: env.GITHUB_OAUTH_CLIENT_ID, client_secret: env.GITHUB_OAUTH_CLIENT_SECRET, code: url.searchParams.get("code") })
  });
  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenData.access_token) throw httpError(401, "GitHub登录失败。");
  const userResponse = await fetch("https://api.github.com/user", { headers: githubHeaders(tokenData.access_token) });
  const user = await userResponse.json();
  if (!userResponse.ok) throw httpError(401, "无法读取GitHub用户信息。");
  const accountAge = Date.now() - new Date(user.created_at).getTime();
  if (accountAge < 7 * 86400_000) throw httpError(403, "为减少滥用，仅支持注册满7天的GitHub账号上传。");
  const session = await signedValue({ id: user.id, login: user.login, avatar: user.avatar_url, exp: Date.now() + 30 * 86400_000 }, env.SESSION_SECRET);
  const redirect = new URL(saved.returnTo); redirect.searchParams.set("login", "success");
  return new Response(null, { status: 302, headers: { Location: redirect.toString(), "Set-Cookie": cookie("swjtu_session", session, 30 * 86400) } });
}

async function currentUser(request, env) {
  const user = await requireUser(request, env);
  return json(user);
}

async function upload(request, env) {
  const user = await requireUser(request, env);
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_FILE_SIZE + 100_000) throw httpError(413, "文件不能超过10MB。");
  const day = new Date().toISOString().slice(0, 10);
  const used = await dailyUploadCount(env, day, user.id);
  if (used >= DAILY_UPLOADS) throw httpError(429, "你今天已上传3份资料，请明天再试。");
  const form = await request.formData();
  const file = form.get("file");
  const title = cleanText(form.get("title"), 80);
  const category = cleanText(form.get("category"), 30);
  const description = cleanText(form.get("description"), 300);
  const year = Number(form.get("year"));
  if (!(file instanceof File) || !title || !category || !form.get("consent")) throw httpError(400, "请填写完整资料信息并确认分享声明。");
  if (file.size === 0 || file.size > MAX_FILE_SIZE) throw httpError(413, "文件大小必须在1字节到10MB之间。");
  if (!Number.isInteger(year) || year < 2000 || year > 2100) throw httpError(400, "年份格式不正确。");
  const extension = String(file.name).split(".").pop().toLowerCase();
  if (!ALLOWED.has(extension)) throw httpError(415, "仅支持PDF、图片、Markdown、TXT、DOCX和XLSX文件。");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!validSignature(extension, bytes)) throw httpError(415, "文件内容与扩展名不一致。");

  const id = crypto.randomUUID();
  const safeCategory = category.replace(/[^\p{L}\p{N}_-]/gu, "-").slice(0, 30) || "其他资料";
  const filePath = `resources/uploads/${year}/${safeCategory}/${id}.${extension}`;
  const metadataPath = `metadata/resources/${id}.json`;
  const ratePath = `metadata/rate/${day}/${user.id}/${id}.json`;
  const hfStorage = huggingFaceStorage(env);
  const metadata = {
    id, title, category, year, description, path: filePath, extension, size: file.size,
    uploader: { githubId: user.id, login: user.login }, createdAt: new Date().toISOString()
  };
  const files = [
    { path: metadataPath, content: JSON.stringify(metadata, null, 2) + "\n", encoding: "utf-8" },
    { path: ratePath, content: JSON.stringify({ id, githubId: user.id, createdAt: metadata.createdAt }) + "\n", encoding: "utf-8" }
  ];
  if (hfStorage) {
    metadata.storage = "huggingface";
    metadata.url = hfStorage.publicUrl(filePath);
    files[0] = { path: metadataPath, content: JSON.stringify(metadata, null, 2) + "\n", encoding: "utf-8" };
    try {
      await putHuggingFaceObject(hfStorage, filePath, bytes, mimeTypeOf(extension));
      const commitUrl = await commitFiles(env, user, files);
      return json({ ok: true, id, commitUrl, storage: "huggingface" }, 201);
    } catch (error) {
      try { await deleteHuggingFaceObject(hfStorage, filePath); } catch (cleanupError) { console.error("HF cleanup failed", cleanupError); }
      throw error;
    }
  }
  const commitUrl = await commitFiles(env, user, [
    { path: filePath, content: toBase64(bytes), encoding: "base64" },
    ...files
  ]);
  return json({ ok: true, id, commitUrl }, 201);
}

function huggingFaceStorage(env) {
  const values = [env.HF_S3_NAMESPACE, env.HF_BUCKET, env.HF_S3_ACCESS_KEY_ID, env.HF_S3_SECRET_ACCESS_KEY];
  const configured = values.some(Boolean);
  if (!configured) return null;
  if (env.HF_S3_NAMESPACE && env.HF_BUCKET && !env.HF_S3_ACCESS_KEY_ID && !env.HF_S3_SECRET_ACCESS_KEY) return null;
  if (values.some((value) => !value)) throw httpError(503, "Hugging Face 存储配置不完整，请联系管理员。");
  const namespace = String(env.HF_S3_NAMESPACE).trim();
  const bucket = String(env.HF_BUCKET).trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(namespace) || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(bucket)) {
    throw httpError(503, "Hugging Face Bucket 名称配置不正确，请联系管理员。");
  }
  const publicBase = String(env.HF_PUBLIC_BASE_URL || `https://huggingface.co/buckets/${namespace}/${bucket}/resolve`).replace(/\/$/, "");
  return {
    namespace,
    bucket,
    accessKeyId: String(env.HF_S3_ACCESS_KEY_ID),
    secretAccessKey: String(env.HF_S3_SECRET_ACCESS_KEY),
    endpoint: `https://s3.hf.co/${encodeURIComponent(namespace)}`,
    publicUrl: (key) => `${publicBase}/${key.split("/").map(encodeURIComponent).join("/")}`
  };
}

function mimeTypeOf(extension) {
  return ({
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    md: "text/markdown; charset=utf-8",
    txt: "text/plain; charset=utf-8",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  })[extension] || "application/octet-stream";
}

async function putHuggingFaceObject(storage, key, bytes, contentType) {
  const response = await signedS3Request(storage, "PUT", key, bytes, { "content-type": contentType });
  if (!response.ok) throw await storageError(response, "Hugging Face 文件上传失败。");
}

async function deleteHuggingFaceObject(storage, key) {
  const response = await signedS3Request(storage, "DELETE", key, new Uint8Array());
  if (!response.ok && response.status !== 404) throw await storageError(response, "Hugging Face 文件清理失败。");
}

async function signedS3Request(storage, method, key, body, extraHeaders = {}) {
  const path = `/${encodePath(storage.bucket)}/${encodePath(key)}`;
  const url = new URL(`${storage.endpoint}${path}`);
  const region = "us-east-1";
  const service = "s3";
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = await sha256Hex(body);
  const signed = {
    host: url.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    ...extraHeaders
  };
  const canonicalHeaders = Object.keys(signed).sort().map((name) => `${name.toLowerCase()}:${String(signed[name]).trim()}\n`).join("");
  const signedHeaders = Object.keys(signed).sort().map((name) => name.toLowerCase()).join(";");
  const canonicalRequest = [method, url.pathname, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, await sha256Hex(new TextEncoder().encode(canonicalRequest))].join("\n");
  const signingKey = await hmac(await hmac(await hmac(await hmac(new TextEncoder().encode(`AWS4${storage.secretAccessKey}`), dateStamp), region), service), "aws4_request");
  const signature = await hmacHex(signingKey, stringToSign);
  const authorization = `AWS4-HMAC-SHA256 Credential=${storage.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return fetch(url, {
    method,
    headers: { ...extraHeaders, "x-amz-content-sha256": payloadHash, "x-amz-date": amzDate, Authorization: authorization },
    body: method === "PUT" ? body : undefined
  });
}

async function storageError(response, fallback) {
  const detail = (await response.text()).replace(/\s+/g, " ").slice(0, 240);
  const error = httpError(502, fallback);
  error.message = `${fallback} (${response.status}${detail ? `: ${detail}` : ""})`;
  return error;
}

function encodePath(value) {
  return String(value).split("/").map((part) => encodeURIComponent(part).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)).join("/");
}

async function sha256Hex(value) {
  return toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", value)));
}

async function hmac(key, value) {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, typeof value === "string" ? new TextEncoder().encode(value) : value));
}

async function hmacHex(key, value) {
  return toHex(await hmac(key, value));
}

function toHex(bytes) {
  return [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
}

async function dailyUploadCount(env, day, userId) {
  const token = await installationToken(env);
  const path = encodeURIComponent(`metadata/rate/${day}/${userId}`);
  const response = await fetch(`https://api.github.com/repos/${env.GITHUB_REPOSITORY}/contents/${path}`, { headers: githubHeaders(token) });
  if (response.status === 404) return 0;
  const data = await response.json();
  if (!response.ok) throw httpError(response.status, data.message || "无法检查上传次数。");
  return Array.isArray(data) ? data.length : 0;
}

async function commitFiles(env, user, files) {
  const token = await installationToken(env);
  const api = `https://api.github.com/repos/${env.GITHUB_REPOSITORY}`;
  const blobs = [];
  for (const file of files) {
    const result = await github(`${api}/git/blobs`, token, { method: "POST", body: { content: file.content, encoding: file.encoding } });
    blobs.push({ path: file.path, mode: "100644", type: "blob", sha: result.sha });
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    const ref = await github(`${api}/git/ref/heads/main`, token);
    const parent = ref.object.sha;
    const commit = await github(`${api}/git/commits/${parent}`, token);
    const tree = await github(`${api}/git/trees`, token, { method: "POST", body: { base_tree: commit.tree.sha, tree: blobs } });
    const next = await github(`${api}/git/commits`, token, {
      method: "POST",
      body: { message: `资料投稿：${files[0].path.split("/").pop()} (@${user.login})`, tree: tree.sha, parents: [parent] }
    });
    try {
      await github(`${api}/git/refs/heads/main`, token, { method: "PATCH", body: { sha: next.sha, force: false } });
      return `https://github.com/${env.GITHUB_REPOSITORY}/commit/${next.sha}`;
    } catch (error) { if (error.status !== 422 || attempt === 2) throw error; }
  }
}

async function installationToken(env) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({ iat: now - 30, exp: now + 540, iss: env.GITHUB_APP_ID }));
  const keyBytes = privateKeyBytes(env.GITHUB_APP_PRIVATE_KEY);
  const key = await crypto.subtle.importKey("pkcs8", keyBytes, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${payload}`));
  const jwt = `${header}.${payload}.${base64url(new Uint8Array(signature))}`;
  const response = await github(`https://api.github.com/app/installations/${env.GITHUB_INSTALLATION_ID}/access_tokens`, jwt, { method: "POST" });
  return response.token;
}

async function github(url, token, options = {}) {
  const response = await fetch(url, {
    method: options.method || "GET", headers: { ...githubHeaders(token), "Content-Type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await response.json();
  if (!response.ok) { const error = httpError(response.status, data.message || "GitHub提交失败。"); throw error; }
  return data;
}

async function requireUser(request, env) {
  const value = parseCookies(request.headers.get("cookie") || "").swjtu_session;
  const user = await verifiedValue(value, env.SESSION_SECRET);
  if (!user || user.exp < Date.now()) throw httpError(401, "请先使用GitHub账号登录。");
  return user;
}

function validSignature(ext, bytes) {
  if (ext === "pdf") return starts(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]);
  if (["jpg", "jpeg"].includes(ext)) return starts(bytes, [0xff, 0xd8, 0xff]);
  if (ext === "png") return starts(bytes, [0x89, 0x50, 0x4e, 0x47]);
  if (ext === "webp") return new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  if (["docx", "xlsx"].includes(ext)) {
    if (!starts(bytes, [0x50, 0x4b])) return false;
    const packageNames = new TextDecoder("latin1").decode(bytes);
    const required = ext === "docx" ? "word/document.xml" : "xl/workbook.xml";
    return packageNames.includes("[Content_Types].xml") && packageNames.includes(required);
  }
  try { new TextDecoder("utf-8", { fatal: true }).decode(bytes); return true; } catch { return false; }
}
function starts(bytes, signature) { return signature.every((value, index) => bytes[index] === value); }
function cleanText(value, max) { return String(value || "").trim().replace(/[<>\u0000-\u001f]/g, "").slice(0, max); }
function parseCookies(value) { return Object.fromEntries(value.split(";").map((item) => item.trim().split("=")).filter((x) => x.length === 2).map(([k, v]) => [k, decodeURIComponent(v)])); }
function cookie(name, value, maxAge) { return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${maxAge}`; }
async function signedValue(payload, secret) {
  const body = base64url(JSON.stringify(payload));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return `${body}.${base64url(new Uint8Array(signature))}`;
}
async function verifiedValue(value, secret) {
  try {
    if (!value || !value.includes(".")) return null;
    const [body, signature] = value.split(".");
    const payload = JSON.parse(new TextDecoder().decode(fromBase64url(body)));
    const expected = await signedValue(payload, secret);
    return expected === `${body}.${signature}` ? payload : null;
  } catch { return null; }
}
function fromBase64url(value) { const base64 = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "="); return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)); }
function privateKeyBytes(pem) {
  const raw = Uint8Array.from(atob(pem.replace(/-----[^-]+-----|\s/g, "")), (c) => c.charCodeAt(0));
  if (!pem.includes("BEGIN RSA PRIVATE KEY")) return raw;
  const version = Uint8Array.from([0x02, 0x01, 0x00]);
  const algorithm = Uint8Array.from([0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00]);
  const wrapped = concat(version, algorithm, Uint8Array.from([0x04]), derLength(raw.length), raw);
  return concat(Uint8Array.from([0x30]), derLength(wrapped.length), wrapped);
}
function derLength(length) {
  if (length < 128) return Uint8Array.from([length]);
  const bytes = []; while (length > 0) { bytes.unshift(length & 255); length >>>= 8; }
  return Uint8Array.from([0x80 | bytes.length, ...bytes]);
}
function concat(...arrays) { const out = new Uint8Array(arrays.reduce((sum, x) => sum + x.length, 0)); let offset = 0; for (const array of arrays) { out.set(array, offset); offset += array.length; } return out; }
function githubHeaders(token) { return { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "SWJTU-MATH" }; }
function base64url(value) { const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value; return toBase64(bytes).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, ""); }
function toBase64(bytes) { let result = ""; for (let i = 0; i < bytes.length; i += 0x8000) result += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(result); }
function json(value, status = 200) { return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json; charset=utf-8" } }); }
function httpError(status, publicMessage) { const error = new Error(publicMessage); error.status = status; error.publicMessage = publicMessage; return error; }
function cors(response, request, env) {
  const origin = request.headers.get("origin");
  if (origin && origin === new URL(env.FRONTEND_ORIGIN).origin) {
    response.headers.set("Access-Control-Allow-Origin", origin); response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type"); response.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS"); response.headers.set("Vary", "Origin");
  }
  return response;
}
