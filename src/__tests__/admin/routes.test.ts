import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { ADMIN_NAV, ADMIN_ROOT } from '@/admin/routes';

const PROTECTED_DIR = join(process.cwd(), 'src/app/app/admin/(protected)');

function pagesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return pagesUnder(path);
    return entry.name === 'page.tsx' ? [path] : [];
  });
}

const requiredCapability = (page: string) =>
  readFileSync(page, 'utf8').match(/requireCapability\('([\w.]+)'\)/)?.[1];

describe('ADMIN_NAV', () => {
  const items = ADMIN_NAV.flatMap((group) => group.items);

  it.each(
    items.map((item) => [item.label, item] as const)
  )('%s checks the same capability on all of its pages', (_label, item) => {
    const section = join(PROTECTED_DIR, item.href.slice(`${ADMIN_ROOT}/`.length));
    const pages = pagesUnder(section);

    expect(pages.length).toBeGreaterThan(0);
    for (const page of pages) expect(requiredCapability(page)).toBe(item.need);
  });
});
