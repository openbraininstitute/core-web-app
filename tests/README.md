# Tests

Phase 0 wires the test harness. No assertions ship yet — Phase 1 adds the
first pilot tests. This page explains where things live and the few rules a
new test must follow.

## Layout

- `src/**/*.test.ts` / `*.spec.ts` — **unit** project, runs in `node`.
  Pure logic only: utilities, selectors, schemas, derived Jotai atoms.
- `src/**/*.test.tsx` / `*.spec.tsx` — **component** project, runs in `jsdom`.
  React + DOM. `vitest.setup.ts` runs once per file in this project.
- `tests/e2e/**` — Playwright specs (lands in Phase 1).

Co-locate unit and component tests next to the file under test. Only E2E lives
under `tests/`.

## Commands

```bash
pnpm test          # vitest run — both projects
pnpm test:watch    # vitest in watch mode
```

## Writing a component test

Use `renderWithProviders` from `tests/test-utils.tsx`. It wraps in the
**minimum** providers a unit needs, additively:

```tsx
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '../../tests/test-utils';
import { MyComponent } from './my-component';

describe('MyComponent', () => {
  it('renders the title', () => {
    renderWithProviders(<MyComponent title="hi" />);
    expect(screen.getByText('hi')).toBeInTheDocument();
  });
});
```

Defaults: Antd `ConfigProvider`, Jotai `Provider`, fresh `QueryClient` (retry
off). Opt in to `SessionProvider` with `withSession: true`. Opt out of any
default by passing `withAntd: false`, etc.

### Rule: never import the app's `QueryProvider`

`src/query-provider/client.tsx` keeps a module-level `browserQueryClient`
singleton. Importing the real `QueryProvider` in a test leaks query cache
state across tests. Always use the fresh `QueryClient` that
`renderWithProviders` constructs (or pass your own throwaway one via
`queryClient`).

## Mocking `next/navigation`

Hooks like `useRouter` / `useSearchParams` do not work outside a Next.js
render tree. Import the prebuilt mock at the top of the test file:

```ts
import { mockPush, mockSearchParams } from '../../tests/mocks/next-navigation';
```

The mock is intentionally not global — tests that don't render router-aware
code shouldn't pay for it.

## Mocking `fetch`

Stub the global directly with `vi.stubGlobal` (cleaned up between tests by
Vitest):

```ts
import { vi } from 'vitest';

vi.stubGlobal(
  'fetch',
  vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))
);
```

Phase 3 will introduce `msw` for the API-client layer. Until then, stubbing
`fetch` is fine for narrow cases.

## `globalThis.__ENV__`

The app reads its config from `window.__ENV__`, injected inline by the root
layout in production. `vitest.setup.ts` populates a minimum-viable stub that
satisfies `clientSchema` in `src/config/schema.ts`. If a test needs different
values, override individual keys in the test file before importing the code
under test.

## Porting an old test

The legacy `*.nodetest.*` files were removed in Phase 1.A. If you find an
older test that still uses Node's built-in runner or Jest globals, port it
with these substitutions (see the Phase 1.A PR for worked examples):

- `node:test` / `jest.*` globals → `import { describe, expect, it, vi } from 'vitest'`.
- `node:assert/strict` → `expect(...).toBe(...)` / `.toEqual(...)` / `.toThrow(...)`.
- `mock.module(path, { namedExports })` / `jest.mock(path, factory)` → `vi.mock(path, () => factory)`. Because `vi.mock` is hoisted, drop the `await import(...)`-after-mock dance and use top-level static imports. For factories that need shared state, lift it into `vi.hoisted(() => ({...}))`.
- Rename `.nodetest.ts` → `.test.ts` and `.nodetest.tsx` → `.test.tsx`. The latter lands in the `component` (jsdom) project automatically.

## E2E tests

Playwright specs live in `tests/e2e/*.spec.ts`. The current set is two
golden-path specs:

- `tests/e2e/landing.spec.ts` — public landing page renders a `<main>` and
  produces no console errors; unauthenticated `/app/virtual-lab` is
  redirected to `/app/log-in` by `src/proxy.ts`.

```bash
pnpm test:e2e:install   # one-time per machine: installs the Chromium browser
pnpm test:e2e           # run the specs
```

`playwright.config.ts` boots a web server automatically:

- locally: `pnpm dev` (HMR, reused if already running)
- in CI (`CI=1`): `pnpm build && pnpm start` (closer to prod, no HMR overhead)

The landing spec collects `pageerror` and `console.error` events into a list
and asserts the list is empty. A new console error on `/` is a real
regression — fix the source, do not relax the assertion.

Authenticated flows are deferred until Phase 4 (Keycloak test realm or mock).
