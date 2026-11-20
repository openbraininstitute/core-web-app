import { expect, test } from 'vitest';

import { PageKind } from '@/api/logbook/types';
import { pageToShow } from '@/features/logbook/api/pages';
import { neighboursOf } from '@/features/logbook/log/page-nav';
import { pathOf, routeOf } from '@/features/logbook/router';

import type { IPage } from '@/api/logbook/types';

const LAB = '0096a3d9-7e41-4f7a-afda-332d0504133a';
const PROJECT = '3dcb6f91-1381-4c8f-814a-554c634ed4e8';
const LOG = '57577a8b-3a80-4f16-95a8-92b0ffb3214c';
const SECTION = '01a1e951-8d5f-7a0c-97eb-b0327538c655';

const page = (id: string, kind: IPage['kind'], position: number): IPage => ({
  id,
  researchId: LOG,
  kind,
  title: id,
  position,
  version: 1,
  editedAt: '2026-11-17T12:00:00Z',
  editedBy: null,
});

test('the address names a section; no page id is the main page', () => {
  const project = { virtualLabId: LAB, projectId: PROJECT };
  const base = `/app/virtual-lab/${LAB}/${PROJECT}/logbook`;
  expect(pathOf(project, LOG)).toBe(`${base}/${LOG}`);
  expect(pathOf(project, LOG, SECTION)).toBe(`${base}/${LOG}/page/${SECTION}`);
  expect(routeOf(`${base}/${LOG}/page/${SECTION}`)).toEqual({
    project,
    logId: LOG,
    pageId: SECTION,
  });
  expect(routeOf(`${base}/${LOG}`)).toEqual({ project, logId: LOG, pageId: null });
  expect(routeOf(`${base}/${LOG}/page/not-an-id`).project).toBeNull();
});

test('the page shown: the one asked for when the log has it, else the main page', () => {
  const main = page('main', PageKind.Main, 0);
  const exp = page(SECTION, PageKind.Section, 1);
  expect(pageToShow([main, exp], SECTION)).toBe(exp);
  expect(pageToShow([main, exp], null)).toBe(main);
  expect(pageToShow([main, exp], 'gone')).toBe(main); // an old link to a deleted section
  expect(pageToShow([], null)).toBeNull(); // a log no writer opened yet
});

test('the pages before and after a page; none for a page no longer in the log', () => {
  const main = page('main', PageKind.Main, 0);
  const a = page('a', PageKind.Section, 1);
  const b = page('b', PageKind.Section, 2);
  const pages = [main, a, b];
  expect(neighboursOf(pages, 'main')).toEqual({ index: 0, previous: null, next: a });
  expect(neighboursOf(pages, 'a')).toEqual({ index: 1, previous: main, next: b });
  expect(neighboursOf(pages, 'b')).toEqual({ index: 2, previous: a, next: null });
  expect(neighboursOf(pages, 'deleted')).toEqual({ index: -1, previous: null, next: null });
});
