import { expect, type Locator } from '@playwright/test';

const CONTROL_COLUMN_HEADERS = new Set(['Select all']);

export function normalizeListingText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export async function normalizedLocatorTexts(locator: Locator): Promise<string[]> {
  return (await locator.allTextContents()).map(normalizeListingText).filter(Boolean);
}

export async function semanticColumnHeaders(tableContainer: Locator): Promise<string[]> {
  const headers = await normalizedLocatorTexts(tableContainer.getByTestId('column-header'));
  return headers.filter((header) => !CONTROL_COLUMN_HEADERS.has(header));
}

export async function expectSemanticColumnHeaders(
  tableContainer: Locator,
  expected: string[]
): Promise<void> {
  await expect(async () => {
    expect(await semanticColumnHeaders(tableContainer)).toEqual(expected);
  }).toPass({ timeout: 30_000 });
}
