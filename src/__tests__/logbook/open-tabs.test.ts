import { expect, test } from 'vitest';

import { PageKind } from '@/api/logbook/types';
import {
  closeTab,
  coolPage,
  keepMsOf,
  NO_TABS,
  settleTabs,
  showArtifact,
  showPage,
  TabKind,
  WARM_KEEP_MS,
  WARM_PAGES,
} from '@/features/logbook/log/open-tabs';

import type { IPage } from '@/api/logbook/types';
import type { IOpenTabs, ITabRef } from '@/features/logbook/log/open-tabs';

const page = (id: string, kind: IPage['kind'] = PageKind.Section): IPage => ({
  id,
  researchId: 'log',
  kind,
  title: id,
  position: 0,
  version: 1,
  editedAt: '2026-11-20T12:00:00Z',
  editedBy: null,
});

const main = page('main', PageKind.Main);
const a = page('a');
const b = page('b');
const c = page('c');
const pages = [main, a, b, c];
const pageTab = (id: string): ITabRef => ({ kind: TabKind.Page, id });
const fileTab = (id: string): ITabRef => ({ kind: TabKind.Artifact, id });
const shown = (...order: readonly IPage[]): IOpenTabs =>
  order.reduce((tabs, next) => showPage(tabs, next), NO_TABS);

test('a page shown gets a tab and the screen; the main page has its tab already', () => {
  const tabs = shown(main, a, b, a);
  expect(tabs.open).toEqual([pageTab('a'), pageTab('b')]);
  expect(tabs.live).toEqual(['a', 'b', 'main']);
});

test('a file opens over the page on screen; showing a page puts the file away', () => {
  const over = showArtifact(showArtifact(shown(main, a), 'fig.png'), 'fig.png');
  expect(over.open).toEqual([pageTab('a'), fileTab('fig.png')]);
  expect(over.artifactId).toBe('fig.png');
  expect(over.live).toEqual(['a', 'main']);
  expect(showPage(over, main).artifactId).toBeNull();
});

test('the address decides the first page; an old link opens the main page', () => {
  expect(settleTabs(NO_TABS, pages, null).live).toEqual(['main']);
  expect(settleTabs(NO_TABS, pages, 'b').live).toEqual(['b']);
  const old = settleTabs(NO_TABS, pages, 'gone');
  expect(old.live).toEqual(['main']);
  expect(settleTabs(old, pages, 'gone')).toBe(old);
  expect(settleTabs(NO_TABS, [], null)).toBe(NO_TABS);
});

test('a link to a page the list did not have yet opens it once the list has it', () => {
  const early = settleTabs(NO_TABS, [main], 'a');
  expect(early.live).toEqual(['main']);
  expect(settleTabs(early, pages, 'a').live).toEqual(['a', 'main']);
});

test('with an old link, a tab click is not undone while the address catches up', () => {
  const old = settleTabs(NO_TABS, pages, 'gone');
  const clicked = showPage(old, a);
  expect(settleTabs(clicked, pages, 'gone')).toBe(clicked);
});

test('the address moving to a page that left the log shows the main page', () => {
  const onA = settleTabs(NO_TABS, pages, 'a');
  const moved = settleTabs(onA, pages, 'gone');
  expect(moved.live).toEqual(['main', 'a']);
  expect(settleTabs(moved, pages, 'gone')).toBe(moved);
});

test('a tab click shows at once; the address catching up changes nothing on screen', () => {
  const start = settleTabs(NO_TABS, pages, 'a');
  const clicked = showArtifact(showPage(start, b), 'fig.png');
  expect(settleTabs(clicked, pages, 'a')).toBe(clicked);
  const caught = settleTabs(clicked, pages, 'b');
  expect(caught.live).toEqual(clicked.live);
  expect(caught.artifactId).toBe('fig.png');
  expect(settleTabs(caught, pages, 'b')).toBe(caught);
});

test('the address moving on its own (outline, back button) shows that page', () => {
  const start = showArtifact(settleTabs(NO_TABS, pages, 'a'), 'fig.png');
  const moved = settleTabs(start, pages, 'c');
  expect(moved.live).toEqual(['c', 'a']);
  expect(moved.artifactId).toBeNull();
  expect(moved.open).toEqual([pageTab('a'), fileTab('fig.png'), pageTab('c')]);
});

test('a page deleted while on screen stays; deleted elsewhere, its tab and view go', () => {
  const start = settleTabs(shown(main, a, b), pages, 'b');
  const without = [main, c];
  const kept = settleTabs(start, without, 'b');
  expect(kept.live).toEqual(['b', 'main']);
  expect(kept.open).toEqual([pageTab('b')]);
  expect(settleTabs(kept, without, 'b')).toBe(kept);
  const left = settleTabs(kept, without, null);
  expect(left.live).toEqual(['main']);
  expect(left.open).toEqual([]);
});

test('closing the tab on screen shows its right neighbour, else the left one', () => {
  const tabs = showArtifact(shown(main, a, b), 'fig.png');
  const onB = showPage(tabs, b);
  const toFile = closeTab(onB, pageTab('b'), 'main');
  expect(toFile.open).toEqual([pageTab('a'), fileTab('fig.png')]);
  expect(toFile.artifactId).toBe('fig.png');
  expect(toFile.live[0]).toBe('a');
  const toLeft = closeTab(tabs, fileTab('fig.png'), 'main');
  expect(toLeft.artifactId).toBeNull();
  expect(toLeft.live[0]).toBe('b');
  const toMain = closeTab(shown(main, a), pageTab('a'), 'main');
  expect(toMain.live).toEqual(['main', 'a']);
  expect(toMain.open).toEqual([]);
});

test('closing a tab that is not on screen changes nothing on screen', () => {
  const tabs = showArtifact(shown(main, a, b), 'fig.png');
  const closed = closeTab(tabs, pageTab('a'), 'main');
  expect(closed.open).toEqual([pageTab('b'), fileTab('fig.png')]);
  expect(closed.live).toEqual(tabs.live);
  expect(closed.artifactId).toBe('fig.png');
});

test('closing the page under a file keeps the file and puts the page to its left under it', () => {
  const tabs = showArtifact(shown(main, a, b), 'fig.png');
  const closed = closeTab(tabs, pageTab('b'), 'main');
  expect(closed.artifactId).toBe('fig.png');
  expect(closed.live[0]).toBe('a');
});

test('the main page tab and a tab that is not open cannot be closed', () => {
  const tabs = shown(main, a);
  expect(closeTab(tabs, pageTab('main'), 'main')).toBe(tabs);
  expect(closeTab(tabs, pageTab('c'), 'main')).toBe(tabs);
});

test('the page on screen is kept; the last ones left stay warm for a while; the rest go', () => {
  const tabs = shown(main, a, b, c);
  expect(WARM_PAGES).toBe(2);
  expect(keepMsOf(tabs, c)).toBeNull();
  expect(keepMsOf(tabs, b)).toBe(WARM_KEEP_MS);
  expect(keepMsOf(tabs, a)).toBe(WARM_KEEP_MS);
  expect(keepMsOf(tabs, main)).toBe(0);
  expect(keepMsOf(closeTab(tabs, pageTab('b'), 'main'), b)).toBe(0);
});

test('a warm page lets go; the page on screen never does', () => {
  const tabs = shown(main, a, b);
  expect(coolPage(tabs, 'a').live).toEqual(['b', 'main']);
  expect(coolPage(tabs, 'b')).toBe(tabs);
  expect(coolPage(tabs, 'gone')).toBe(tabs);
});
