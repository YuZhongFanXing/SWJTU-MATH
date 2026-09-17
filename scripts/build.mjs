import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const output = path.join(root, "site");
const excludedRoots = new Set([".git", ".github", "web", "worker", "scripts", "site", "metadata"]);
const ignoredFiles = new Set(["README.md", "LICENSE", "mkdocs.yml", "package.json", ".gitignore"]);
const allowed = new Set(["pdf", "jpg", "jpeg", "png", "webp", "md", "txt", "m", "docx", "xlsx"]);

const normalize = (value) => value.split(path.sep).join("/");
const extensionOf = (name) => path.extname(name).slice(1).toLowerCase();
const titleOf = (name) => path.basename(name, path.extname(name)).replaceAll("_", " ");
const idOf = (value) => Buffer.from(value).toString("base64url");
const previewKindOf = (extension) => {
  if (extension === "pdf") return "pdf";
  if (["jpg", "jpeg", "png", "webp"].includes(extension)) return "image";
  if (["md", "txt", "m"].includes(extension)) return "text";
  if (extension === "docx") return "docx";
  if (extension === "xlsx") return "xlsx";
  return "none";
};

async function walk(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const resources = [];
  for (const entry of entries) {
    if (prefix === "" && excludedRoots.has(entry.name)) continue;
    const relative = normalize(path.join(prefix, entry.name));
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) resources.push(...await walk(absolute, relative));
    else if (!ignoredFiles.has(relative) && allowed.has(extensionOf(entry.name))) {
      const info = await stat(absolute);
      const parts = relative.split("/");
      resources.push({
        id: idOf(relative),
        title: titleOf(entry.name),
        category: parts.length > 1 ? parts[0] : "综合资料",
        path: relative,
        extension: extensionOf(entry.name),
        size: info.size,
        previewKind: previewKindOf(extensionOf(entry.name)),
        previewable: previewKindOf(extensionOf(entry.name)) !== "none",
        source: "repository"
      });
    }
  }
  return resources;
}

async function loadUploadedMetadata() {
  const directory = path.join(root, "metadata", "resources");
  try {
    const files = (await readdir(directory)).filter((name) => name.endsWith(".json"));
    return await Promise.all(files.map(async (name) => JSON.parse(await readFile(path.join(directory, name), "utf8"))));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(path.join(root, "web"), output, { recursive: true });
const vendor = path.join(output, "vendor");
await mkdir(vendor, { recursive: true });
await cp(path.join(root, "node_modules", "jszip", "dist", "jszip.min.js"), path.join(vendor, "jszip.min.js"));
await cp(path.join(root, "node_modules", "docx-preview", "dist", "docx-preview.min.js"), path.join(vendor, "docx-preview.min.js"));
await cp(path.join(root, "node_modules", "xlsx", "dist", "xlsx.full.min.js"), path.join(vendor, "xlsx.full.min.js"));
if (process.env.UPLOAD_API_BASE) {
  await writeFile(path.join(output, "config.js"), `window.SWJTU_MATH_CONFIG = { apiBase: ${JSON.stringify(process.env.UPLOAD_API_BASE.replace(/\/$/, ""))} };\n`);
}

const existing = await walk(root);
const uploaded = (await loadUploadedMetadata())
  .filter((item) => allowed.has(String(item.extension).toLowerCase()))
  .map((item) => ({
    ...item,
    previewKind: previewKindOf(String(item.extension).toLowerCase()),
    previewable: previewKindOf(String(item.extension).toLowerCase()) !== "none",
    source: "upload"
  }));
const byPath = new Map(existing.map((item) => [item.path, item]));
for (const item of uploaded) byPath.set(item.path, item);
const resources = [...byPath.values()].sort((a, b) => a.category.localeCompare(b.category, "zh-CN") || a.title.localeCompare(b.title, "zh-CN"));

for (const resource of resources) {
  const source = path.join(root, resource.path);
  const destination = path.join(output, resource.path);
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(source, destination);
}

await writeFile(path.join(output, "resources.json"), JSON.stringify({ generatedAt: new Date().toISOString(), resources }, null, 2));
console.log(`Built ${resources.length} resources into ${path.relative(root, output)}/`);
