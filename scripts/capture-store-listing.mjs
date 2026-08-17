import { existsSync, readdirSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outputDirectory = join(root, "store-listing");
const screenshotPath = join(outputDirectory, "screenshot-command-manager-1280x800.png");
const storeIconPath = join(outputDirectory, "store-icon-128.png");
const smallPromoPath = join(outputDirectory, "small-promo-440x280.png");
const sourceIconPath = join(root, "assets", "icons", "icon-128.png");
const profile = await mkdtemp(join(tmpdir(), "expander-store-listing-"));

const playwrightRoot = process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "ms-playwright") : "";
const installedChromium = existsSync(playwrightRoot)
  ? readdirSync(playwrightRoot)
      .filter((name) => /^chromium-\d+$/u.test(name))
      .sort((left, right) => Number(right.split("-")[1]) - Number(left.split("-")[1]))
      .map((name) => join(playwrightRoot, name, "chrome-win64", "chrome.exe"))
  : [];
const chromiumCandidates = [
  process.env.EXPANDER_CHROMIUM_PATH,
  process.env.SLASH_CHROMIUM_PATH,
  ...installedChromium,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium"
].filter(Boolean);
const chromiumPath = chromiumCandidates.find(existsSync);

if (!chromiumPath) {
  throw new Error("No Chromium executable found. Set EXPANDER_CHROMIUM_PATH and run npm run store-assets again.");
}

function pngDimensions(buffer) {
  if (buffer.length < 24 || buffer.toString("ascii", 1, 4) !== "PNG") {
    throw new Error("Expected a PNG image.");
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

await mkdir(outputDirectory, { recursive: true });
await copyFile(sourceIconPath, storeIconPath);

let context;
const consoleProblems = [];

try {
  context = await chromium.launchPersistentContext(profile, {
    executablePath: chromiumPath,
    headless: true,
    viewport: { width: 1280, height: 800 },
    args: [
      `--disable-extensions-except=${root}`,
      `--load-extension=${root}`
    ]
  });

  let serviceWorker = context.serviceWorkers()[0];
  if (!serviceWorker) serviceWorker = await context.waitForEvent("serviceworker", { timeout: 15000 });
  const extensionId = new URL(serviceWorker.url()).host;
  const page = await context.newPage();

  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      consoleProblems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => consoleProblems.push(`pageerror: ${error.message}`));

  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.locator("#manager-dashboard").waitFor({ state: "visible" });

  await page.evaluate(async () => {
    const now = Date.now();
    const workSectionId = "store-demo-work";
    const personalSectionId = "store-demo-personal";
    const commands = [
      {
        id: "store-demo-followup",
        shortcut: "/followup",
        expansion: "Hi there — just following up. Let me know if you have any questions.",
        enabled: true,
        caseSensitive: true,
        sectionId: workSectionId
      },
      {
        id: "store-demo-peoria",
        shortcut: "/peoria",
        expansion: "PEORIA {{date:today|addDays:1|format:MM/DD}}-{{date:today|startOfWeek:monday|addDays:11|format:MM/DD}}",
        enabled: true,
        caseSensitive: true,
        sectionId: workSectionId
      },
      {
        id: "store-demo-status",
        shortcut: "/status",
        expansion: "Quick update: everything is on track and moving forward as planned.",
        enabled: true,
        caseSensitive: true,
        sectionId: workSectionId
      },
      {
        id: "store-demo-address",
        shortcut: "!address",
        expansion: "123 Market Street\nPhoenix, AZ 85004",
        enabled: true,
        caseSensitive: true,
        sectionId: personalSectionId
      },
      {
        id: "store-demo-email",
        shortcut: ";email",
        expansion: "hello@example.com",
        enabled: true,
        caseSensitive: false,
        sectionId: personalSectionId
      }
    ];

    await SlashStore.saveState({
      commands,
      sections: [
        { id: workSectionId, name: "Work" },
        { id: personalSectionId, name: "Personal" }
      ],
      settings: {
        expandOnSpace: true,
        expandOnTab: true,
        expandOnEnter: true,
        autoExpand: false
      }
    });

    await chrome.storage.local.set({
      usageStats: {
        "store-demo-followup": { count: 42, lastUsedAt: now - 2 * 60 * 60 * 1000, trackedSince: now - 14 * 24 * 60 * 60 * 1000 },
        "store-demo-peoria": { count: 28, lastUsedAt: now - 24 * 60 * 60 * 1000, trackedSince: now - 14 * 24 * 60 * 60 * 1000 },
        "store-demo-status": { count: 17, lastUsedAt: now - 2 * 24 * 60 * 60 * 1000, trackedSince: now - 14 * 24 * 60 * 60 * 1000 },
        "store-demo-address": { count: 6, lastUsedAt: now - 4 * 24 * 60 * 60 * 1000, trackedSince: now - 14 * 24 * 60 * 60 * 1000 },
        "store-demo-email": { count: 9, lastUsedAt: now - 3 * 24 * 60 * 60 * 1000, trackedSince: now - 14 * 24 * 60 * 60 * 1000 }
      }
    });
  });

  await page.reload();
  await page.locator("#manager-dashboard").waitFor({ state: "visible" });
  await page.locator("#dashboard-most-used-section").waitFor({ state: "visible" });
  await page.locator("#manager-test").fill("/peoria");
  await page.locator("#manager-test").press("Space");
  await page.locator("#manager-test").evaluate((element) => element.blur());
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: screenshotPath, animations: "disabled" });
}
finally {
  if (context) await context.close();
  await rm(profile, { recursive: true, force: true });
}

if (consoleProblems.length) {
  throw new Error(`Store screenshot logged browser problems:\n${consoleProblems.join("\n")}`);
}

const iconDimensions = pngDimensions(await readFile(storeIconPath));
const screenshotDimensions = pngDimensions(await readFile(screenshotPath));
const smallPromoDimensions = pngDimensions(await readFile(smallPromoPath));

if (iconDimensions.width !== 128 || iconDimensions.height !== 128) {
  throw new Error(`Store icon must be 128x128; received ${iconDimensions.width}x${iconDimensions.height}.`);
}
if (screenshotDimensions.width !== 1280 || screenshotDimensions.height !== 800) {
  throw new Error(`Store screenshot must be 1280x800; received ${screenshotDimensions.width}x${screenshotDimensions.height}.`);
}
if (smallPromoDimensions.width !== 440 || smallPromoDimensions.height !== 280) {
  throw new Error(`Small promo image must be 440x280; received ${smallPromoDimensions.width}x${smallPromoDimensions.height}.`);
}

console.log(`Created ${storeIconPath}`);
console.log(`Created ${screenshotPath}`);
console.log(`Created ${smallPromoPath}`);
