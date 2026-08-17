const test = require("node:test");
const assert = require("node:assert/strict");

require("../shared/defaults.js");
const store = require("../shared/storage.js");

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function selectKeys(data, keys) {
  if (keys === null || keys === undefined) return clone(data);
  if (typeof keys === "string") return Object.prototype.hasOwnProperty.call(data, keys) ? { [keys]: clone(data[keys]) } : {};
  if (Array.isArray(keys)) {
    return Object.fromEntries(keys.filter((key) => Object.prototype.hasOwnProperty.call(data, key)).map((key) => [key, clone(data[key])]));
  }
  return Object.fromEntries(Object.entries(keys).map(([key, fallback]) => [
    key,
    Object.prototype.hasOwnProperty.call(data, key) ? clone(data[key]) : clone(fallback)
  ]));
}

function createChromeStorage(initialSync = {}) {
  const syncData = clone(initialSync);
  const localData = {};
  const listeners = new Set();

  function createArea(data, areaName, quotaBytes = Infinity, quotaBytesPerItem = Infinity) {
    return {
      QUOTA_BYTES: quotaBytes,
      QUOTA_BYTES_PER_ITEM: quotaBytesPerItem,
      async get(keys) {
        return selectKeys(data, keys);
      },
      async getBytesInUse(keys) {
        const selected = selectKeys(data, keys);
        return Object.entries(selected).reduce((total, [key, value]) => total + store.syncItemBytes(key, value), 0);
      },
      async set(items) {
        const candidate = { ...data, ...clone(items) };
        for (const [key, value] of Object.entries(items)) {
          if (store.syncItemBytes(key, value) > quotaBytesPerItem) throw new Error("QUOTA_BYTES_PER_ITEM quota exceeded");
        }
        const totalBytes = Object.entries(candidate).reduce((total, [key, value]) => total + store.syncItemBytes(key, value), 0);
        if (totalBytes > quotaBytes) throw new Error("QUOTA_BYTES quota exceeded");
        const changes = {};
        Object.entries(items).forEach(([key, value]) => {
          changes[key] = { oldValue: clone(data[key]), newValue: clone(value) };
          data[key] = clone(value);
        });
        listeners.forEach((listener) => listener(changes, areaName));
      },
      async remove(keys) {
        const changes = {};
        for (const key of Array.isArray(keys) ? keys : [keys]) {
          if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
          changes[key] = { oldValue: clone(data[key]) };
          delete data[key];
        }
        if (Object.keys(changes).length) listeners.forEach((listener) => listener(changes, areaName));
      }
    };
  }

  return {
    chrome: {
      storage: {
        sync: createArea(syncData, "sync", 102400, 8192),
        local: createArea(localData, "local", 10485760),
        onChanged: {
          addListener(listener) { listeners.add(listener); },
          removeListener(listener) { listeners.delete(listener); }
        }
      }
    },
    readSync() {
      return clone(syncData);
    },
    readLocal() {
      return clone(localData);
    }
  };
}

test("command case sensitivity defaults on and explicit off persists", () => {
  const strict = store.sanitizeCommand({ shortcut: "/strict", expansion: "Strict" });
  const flexible = store.sanitizeCommand({ shortcut: "/flex", expansion: "Flexible", caseSensitive: false });
  assert.equal(strict.caseSensitive, true);
  assert.equal(flexible.caseSensitive, false);
});

test("command chunks stay below Chrome Sync's per-item quota", () => {
  const commands = [{
    id: "large-command",
    shortcut: "/large",
    expansion: "\u{1F31F}".repeat(3500),
    enabled: true,
    sectionId: null
  }];
  const encoded = store.encodeCommandChunks(commands);
  assert.ok(encoded.meta.chunkCount > 1);
  Object.entries(encoded.items).forEach(([key, value]) => {
    assert.ok(store.syncItemBytes(key, value) < 8192);
  });
  assert.deepEqual(store.decodeCommandChunks({ ...encoded.items, [store.COMMANDS_META_KEY]: encoded.meta }), commands);
});

test("adding a command beyond the legacy per-item boundary saves in chunks", async () => {
  const legacyCommands = Array.from({ length: 8 }, (_, index) => ({
    id: `legacy-${index}`,
    shortcut: `/legacy-${index}`,
    expansion: `${index}: ${"x".repeat(900)}`,
    enabled: true,
    sectionId: null
  }));
  assert.ok(store.syncItemBytes("commands", legacyCommands) < 8192);

  const mock = createChromeStorage({
    commands: legacyCommands,
    sections: [],
    settings: SlashDefaults.DEFAULT_SETTINGS,
    stateVersion: SlashDefaults.STATE_VERSION
  });
  global.chrome = mock.chrome;

  const legacyState = await store.getState();
  legacyState.commands.push({
    id: "new-command",
    shortcut: "/new",
    expansion: "New command: ".concat("y".repeat(1000)),
    enabled: true,
    sectionId: null
  });
  assert.ok(store.syncItemBytes("commands", legacyState.commands) > 8192);
  await store.saveState(legacyState);
  const migrated = mock.readSync();
  assert.equal(Object.prototype.hasOwnProperty.call(migrated, "commands"), false);
  assert.ok(migrated[store.COMMANDS_META_KEY].chunkCount > 1);

  const saved = await store.getState();
  assert.equal(saved.commands.length, 9);
  assert.ok(saved.commands.some((command) => command.shortcut === "/new"));
});

test("moves the command library between sync and device-only storage", async () => {
  const mock = createChromeStorage({
    commands: [{ id: "synced", shortcut: "/sync", expansion: "Synced", enabled: true }],
    sections: [],
    settings: SlashDefaults.DEFAULT_SETTINGS,
    stateVersion: SlashDefaults.STATE_VERSION
  });
  global.chrome = mock.chrome;

  assert.equal(await store.getStorageMode(), "sync");
  const localState = await store.setStorageMode("local");
  assert.equal(localState.commands[0].shortcut, "/sync");
  assert.equal(mock.readLocal().storageMode, "local");
  assert.equal(mock.readLocal().localState.commands[0].shortcut, "/sync");

  localState.commands.push({ id: "local", shortcut: "/local", expansion: "Local", enabled: true });
  await store.saveState(localState);
  assert.equal((await store.getState()).commands.length, 2);
  assert.equal(mock.readSync().commands.length, 1);

  await store.setStorageMode("sync");
  assert.equal(await store.getStorageMode(), "sync");
  assert.equal((await store.getState()).commands.length, 2);
  assert.ok((await store.getStorageInfo()).bytesInUse > 0);
});

test("preflights the total Chrome Sync quota with a useful recovery message", async () => {
  const mock = createChromeStorage({
    commands: [],
    sections: [],
    settings: SlashDefaults.DEFAULT_SETTINGS,
    stateVersion: SlashDefaults.STATE_VERSION
  });
  global.chrome = mock.chrome;

  const oversized = await store.getState();
  oversized.commands = Array.from({ length: 20 }, (_, index) => ({
    id: `large-${index}`,
    shortcut: `/large-${index}`,
    expansion: `${index}-${"x".repeat(7990)}`,
    enabled: true,
    sectionId: null
  }));

  await assert.rejects(
    store.saveState(oversized),
    /too large for Chrome Sync.*This device only.*export a backup/iu
  );
  assert.deepEqual(mock.readSync().commands, []);
});
