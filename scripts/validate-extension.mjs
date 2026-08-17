import { readFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Script } from "node:vm";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const manifest = JSON.parse(await readFile(join(root, "manifest.json"), "utf8"));

if (manifest.manifest_version !== 3) throw new Error("Manifest must use version 3.");

const referenced = [
  manifest.background?.service_worker,
  manifest.action?.default_popup,
  manifest.options_ui?.page,
  ...Object.values(manifest.icons || {}),
  ...Object.values(manifest.action?.default_icon || {}),
  ...(manifest.content_scripts || []).flatMap((entry) => entry.js || [])
].filter(Boolean);

for (const relativePath of new Set(referenced)) {
  await access(join(root, relativePath), constants.R_OK);
}

const htmlEntries = [manifest.action?.default_popup, manifest.options_ui?.page].filter(Boolean);
const htmlSources = new Map();
for (const htmlPath of htmlEntries) {
  const html = await readFile(join(root, htmlPath), "utf8");
  htmlSources.set(htmlPath, html);
  const ids = [...html.matchAll(/\bid="([^"]+)"/gu)].map((match) => match[1]);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicateIds.length) throw new Error(`${htmlPath} contains duplicate IDs: ${[...new Set(duplicateIds)].join(", ")}`);

  const idSet = new Set(ids);
  for (const match of html.matchAll(/\b(?:for|aria-labelledby|aria-describedby)="([^"]+)"/gu)) {
    for (const id of match[1].split(/\s+/u).filter(Boolean)) {
      if (!idSet.has(id)) throw new Error(`${htmlPath} references missing ID #${id}.`);
    }
  }

  for (const match of html.matchAll(/(?:src|href)="([^"]+\.(?:js|css|svg))"/gu)) {
    referenced.push(match[1]);
  }
}

const allReferenced = new Set(referenced);
for (const relativePath of allReferenced) {
  await access(join(root, relativePath), constants.R_OK);
  if (relativePath.endsWith(".js")) {
    const source = await readFile(join(root, relativePath), "utf8");
    new Script(source, { filename: relativePath });
  }
}

for (const [htmlPath, html] of htmlSources) {
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/gu)].map((match) => match[1]));
  const scripts = [...html.matchAll(/<script\s+src="([^"]+\.js)"/gu)].map((match) => match[1]);
  for (const scriptPath of scripts) {
    const source = await readFile(join(root, scriptPath), "utf8");
    for (const match of source.matchAll(/querySelector\(["']#([A-Za-z_-][\w-]*)["']\)/gu)) {
      if (!ids.has(match[1])) throw new Error(`${scriptPath} queries missing ${htmlPath} element #${match[1]}.`);
    }
  }
}

console.log(`Validated Manifest V3, JavaScript syntax, and ${allReferenced.size} referenced files.`);
