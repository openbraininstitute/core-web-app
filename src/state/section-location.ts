'use client';

import { atom } from 'jotai';

import { WorkspaceMainPages } from '@/constants';

/**
 * Sections whose last visited URL is restored when returning to them via the
 * top-menu tabs: leave Data for another section, come back to Data and land on
 * the page you were on instead of the browse root — including a workflow you
 * had drilled into. Clicking the tab of the section you are already in still
 * goes to the section root.
 */
export const PRESERVED_LOCATION_SECTIONS = new Set<string>(Object.values(WorkspaceMainPages));

/** Last visited URL (pathname + search) per workspace section, in-memory. */
export const lastSectionLocationAtom = atom<Record<string, string>>({});
