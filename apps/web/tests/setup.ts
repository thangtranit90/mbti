import { beforeEach } from 'vitest';

// Node 25's experimental Web Storage stub shadows jsdom's localStorage as a
// methodless object on `window.localStorage`. Replace it with an in-memory
// implementation so zustand's `persist` middleware (and any direct user code)
// works in unit tests. Real browsers are unaffected.
function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key) {
      return map.has(key) ? map.get(key)! : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
    key(index) {
      return Array.from(map.keys())[index] ?? null;
    },
  };
}

const memory = createMemoryStorage();

Object.defineProperty(window, 'localStorage', {
  configurable: true,
  enumerable: true,
  value: memory,
  writable: true,
});

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  enumerable: true,
  value: memory,
  writable: true,
});

// Reset between tests to prevent cross-file state leakage from zustand persist writes.
beforeEach(() => {
  memory.clear();
});
