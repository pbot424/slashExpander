import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const version = String(process.argv[2] || "");
const components = version.split(".");
const validExtensionVersion = components.length === 3
  && components.every((component) => /^(?:0|[1-9]\d*)$/u.test(component) && Number(component) <= 65535)
  && components.some((component) => Number(component) > 0);
if (!validExtensionVersion) {
  throw new Error("Provide a valid three-part Chrome extension version, for example: npm run version:set -- 0.4.1");
}

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const paths = {
  manifest: join(root, "manifest.json"),
  packageJson: join(root, "package.json"),
  packageLock: join(root, "package-lock.json")
};
const manifest = JSON.parse(await readFile(paths.manifest, "utf8"));
const packageJson = JSON.parse(await readFile(paths.packageJson, "utf8"));
const packageLock = JSON.parse(await readFile(paths.packageLock, "utf8"));

manifest.version = version;
packageJson.version = version;
packageLock.version = version;
if (!packageLock.packages?.[""]) throw new Error("package-lock.json is missing its root package metadata.");
packageLock.packages[""].version = version;

await Promise.all([
  writeFile(paths.manifest, `${JSON.stringify(manifest, null, 2)}\n`),
  writeFile(paths.packageJson, `${JSON.stringify(packageJson, null, 2)}\n`),
  writeFile(paths.packageLock, `${JSON.stringify(packageLock, null, 2)}\n`)
]);

console.log(`Updated manifest.json, package.json, and package-lock.json to ${version}.`);
