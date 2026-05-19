import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// window.__ENV__ — root layout injects this inline; tests render without it.
// Keep aligned with the client schema in src/config/schema.ts (clientSchema).
// Only keys that are required (non-optional) in clientSchema need real values;
// API_ORIGIN satisfies the API URL refinement for the platform URL fields.
globalThis.__ENV__ = {
  APP_VERSION: '0.0.0-test',
  DEPLOYMENT_ENV: 'local',
  ROOT_ROUTE: '/',
  API_ORIGIN: 'http://test.local',
  STRIPE_PUBLISHABLE_KEY: 'pk_test_stub',
  SANITY_PROJECT_ID: 'test-sanity-project',
  SANITY_DATASET: 'staging',
  ENTITY_CORE_PUBLIC_PROJECT_ID: 'test-public-project',
  ENTITY_CORE_PUBLIC_VIRTUAL_LAB_ID: 'test-public-virtual-lab',
  APP_DEFAULT__BRAIN_REGION_HIERARCHY_ID: 'test-hierarchy-id',
  MOUSE_ATLAS__ID: 'test-mouse-atlas-id',
  MOUSE_DEFAULT__SELECTED_BRAIN_REGION_ID: 'test-mouse-region',
  HUMAN_DEFAULT__SELECTED_BRAIN_REGION_ID: 'test-human-region',
  RAT_DEFAULT__SELECTED_BRAIN_REGION_ID: 'test-rat-region',
  EXCLUDED_HIERARCHY_IDS: '',
  LEGACY_DEFAULT_CIRCUIT_ID: 'http://test.local/legacy-circuit',
  NOTEBOOK_REPO_URL: 'http://test.local/notebooks',
};

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
  root = null;
  rootMargin = '';
  thresholds = [];
}
vi.stubGlobal('ResizeObserver', ResizeObserverMock);
vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }),
});

window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.scrollTo = vi.fn();

afterEach(() => cleanup());
