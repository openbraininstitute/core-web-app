import { vi } from 'vitest';

vi.mock('@/config', () => ({
  config: {
    ROOT_ROUTE: '/app',
  },
  isServer: true,
}));

vi.mock('@/ui/segments/explore/circuit/elements/download-panel', () => ({
  DownloadPanel: vi.fn(() => null),
}));

class SessionStorageMock implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  clear() {
    this.store.clear();
  }

  getItem(key: string) {
    return this.store.get(key) ?? null;
  }

  key(index: number) {
    return [...this.store.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
}

const sessionStorageMock = new SessionStorageMock();

vi.stubGlobal('sessionStorage', sessionStorageMock);
vi.stubGlobal('window', {
  sessionStorage: sessionStorageMock,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
} satisfies Pick<Window, 'sessionStorage' | 'addEventListener' | 'removeEventListener'>);
