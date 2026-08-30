import "@testing-library/jest-dom";

const memory: Record<string, string> = {};
const memoryStorage: Storage = {
  get length() {
    return Object.keys(memory).length;
  },
  clear() {
    for (const key of Object.keys(memory)) delete memory[key];
  },
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null;
  },
  key(index) {
    return Object.keys(memory)[index] ?? null;
  },
  removeItem(key) {
    delete memory[key];
  },
  setItem(key, value) {
    memory[key] = String(value);
  },
};

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  writable: true,
  value: memoryStorage,
});
Object.defineProperty(window, "localStorage", {
  configurable: true,
  writable: true,
  value: memoryStorage,
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
