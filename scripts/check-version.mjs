import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const manifest = JSON.parse(await readFile(join(root, "manifest.json"), "utf8"));
const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const packageLock = JSON.parse(await readFile(join(root, "package-lock.json"), "utf8"));
const versions = new Map([
  ["manifest.json", manifest.version],
  ["package.json", packageJson.version],
  ["package-lock.json", packageLock.version],
  ["package-lock.json root package", packageLock.packages?.[""]?.version]
]);
const uniqueVersions = new Set(versions.values());

if (uniqueVersions.size !== 1 || uniqueVersions.has(undefined)) {
  const detail = [...versions].map(([file, version]) => `${file}: ${version || "missing"}`).join(", ");
  throw new Error(`Project versions do not match. ${detail}`);
}

const version = manifest.version;
const components = String(version).split(".");
const validExtensionVersion = components.length === 3
  && components.every((component) => /^(?:0|[1-9]\d*)$/u.test(component) && Number(component) <= 65535)
  && components.some((component) => Number(component) > 0);
if (!validExtensionVersion) {
  throw new Error(`Project version '${version}' is not a valid three-part Chrome extension version.`);
}
if (process.env.RELEASE_TAG && process.env.RELEASE_TAG !== `v${version}`) {
  throw new Error(`Release tag '${process.env.RELEASE_TAG}' must match project version 'v${version}'.`);
}

console.log(`Validated project version ${version}${process.env.RELEASE_TAG ? ` against ${process.env.RELEASE_TAG}` : ""}.`);
