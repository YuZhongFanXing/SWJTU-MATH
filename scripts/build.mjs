import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const output = path.join(root, "site");
const excludedRoots = new Set([".git", ".github", "web", "worker", "scripts", "site", "metadata"]);
const ignoredFiles = new Set(["README.md", "LICENSE", "mkdocs.yml", "package.json", ".gitignore"]);
const allowed = new Set(["pdf", "jpg", "jpeg", "png", "webp", "md", "txt", "m", "docx", "xlsx", "zip", "rar"]);
const previewable = new Set(["pdf", "jpg", "jpeg", "png", "webp", "md", "txt", "m"]);

const normalize = (value) => value.split(path.sep).join("/");
const extensionOf = (name) => path.extname(name).slice(1).toLowerCase();
const titleOf = (name) => path.basename(name, path.extname(name)).replaceAll("_", " ");
const idOf = (value) => Buffer.from(value).toString("base64url");

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
        previewable: previewable.has(extensionOf(entry.name)),
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

const existing = await walk(root);
const uploaded = (await loadUploadedMetadata()).map((item) => ({
  ...item,
  previewable: previewable.has(String(item.extension).toLowerCase()),
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
