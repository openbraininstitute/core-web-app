// Markdown to and from a page's Yjs doc, headless; same blocks the editor makes.
import { getSchema } from '@tiptap/core';
import { MarkdownManager } from '@tiptap/markdown';
import { updateYFragment, yXmlFragmentToProsemirrorJSON } from '@tiptap/y-tiptap';
import { isNil } from 'es-toolkit';
import * as Y from 'yjs';

import { BLOCK_TYPES, blockExtensions, FRAGMENT } from '@/features/logbook/blocks/extensions';

import type { JSONContent } from '@tiptap/core';

// For packages that don't depend on Tiptap.
export type TBlockJson = JSONContent;

export const schema = getSchema(blockExtensions);
const manager = new MarkdownManager({ extensions: blockExtensions });
const blockTypes: ReadonlySet<string> = new Set(BLOCK_TYPES);

// Headless content gets ids too, so it's addressable like typed content.
export const withBlockIds = (doc: JSONContent): JSONContent => ({
  ...doc,
  content: (doc.content ?? []).map((block) =>
    blockTypes.has(block.type ?? '') && isNil(block.attrs?.['id'])
      ? { ...block, attrs: { ...block.attrs, id: crypto.randomUUID() } }
      : block
  ),
});

export const markdownToJson = (markdown: string): JSONContent =>
  withBlockIds(manager.parse(markdown));

export const jsonToMarkdown = (json: JSONContent): string => manager.serialize(json);

export const docToJson = (doc: Y.Doc): JSONContent =>
  yXmlFragmentToProsemirrorJSON(doc.getXmlFragment(FRAGMENT));

export const docToMarkdown = (doc: Y.Doc): string => jsonToMarkdown(docToJson(doc));

// Smallest Yjs change: unchanged blocks keep identity, so carets and others' edits survive.
export function writeJson(doc: Y.Doc, json: JSONContent, origin: unknown = null): void {
  const node = schema.nodeFromJSON(json);
  doc.transact(() => {
    updateYFragment(doc, doc.getXmlFragment(FRAGMENT), node, {
      mapping: new Map(),
      isOMark: new Map(),
    });
  }, origin);
}

export const writeMarkdown = (doc: Y.Doc, markdown: string, origin: unknown = null): void =>
  writeJson(doc, markdownToJson(markdown), origin);

export function appendMarkdown(doc: Y.Doc, markdown: string, origin: unknown = null): void {
  const current = docToJson(doc);
  const added = markdownToJson(markdown).content ?? [];
  writeJson(doc, { ...current, content: [...(current.content ?? []), ...added] }, origin);
}

// The Yjs update `edit` makes, as an agent sends it.
export function changeOf(doc: Y.Doc, edit: (doc: Y.Doc) => void): Uint8Array {
  const before = Y.encodeStateVector(doc);
  edit(doc);
  return Y.encodeStateAsUpdate(doc, before);
}
