import { globSync, readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

// Layouts don't re-run on client-side navigation, so the protected layout alone doesn't guard
// a page: each one has to check for itself.
const PAGES = globSync('src/app/app/admin/**/page.tsx').filter((file) =>
  file.includes('/(protected)/')
);
const ROUTES = globSync('src/app/api/admin/**/route.ts');

describe('admin pages', () => {
  it('finds the protected pages', () => {
    expect(PAGES.length).toBeGreaterThan(0);
  });

  it.each(PAGES)('%s calls requireCapability', (file) => {
    expect(readFileSync(file, 'utf8')).toMatch(/await requireCapability\(/);
  });
});

describe('admin route handlers', () => {
  it('finds the route handlers', () => {
    expect(ROUTES.length).toBeGreaterThan(0);
  });

  it.each(ROUTES)('%s calls capabilityDenial', (file) => {
    expect(readFileSync(file, 'utf8')).toMatch(/await capabilityDenial\(/);
  });
});
