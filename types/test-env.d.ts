// Test-only global declarations. The component project's `vitest.setup.ts`
// populates `globalThis.__ENV__` with the minimum keys needed for the
// client schema (`src/config/schema.ts`) to parse in a jsdom environment.
//
// The runtime shape mirrors what `src/app/layout.tsx` injects via
// `window.__ENV__` — a plain string-keyed record. `src/config/client.ts`
// already declares `Window.__ENV__`; this file declares the `globalThis`
// surface so the setup file's assignment type-checks.

declare global {
  // eslint-disable-next-line no-var
  var __ENV__: Record<string, string> | undefined;
}

export {};
