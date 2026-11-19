// Markdown in and out of a page's Yjs document, without a browser (Bun, Node, a worker).
// Agents write markdown; this turns it into the exact blocks a person's editor makes, and back.
import { getSchema } from '@tiptap/core';
import { MarkdownManager } from '@tiptap/markdown';
import { updateYFragment, yXmlFragmentToProsemirrorJSON } from '@tiptap/y-tiptap';
import { isNil } from 'es-toolkit';
import * as Y from 'yjs';

import { BLOCK_TYPES, blockExtensions, FRAGMENT } from '@/features/logbook/blocks/extensions';

import type { JSONContent } from '@tiptap/core';

// A page or a block as ProseMirror JSON, for packages that do not depend on Tiptap themselves.
export type TBlockJson = JSONContent;

export const schema = getSchema(blockExtensions);
const manager = new MarkdownManager({ extensions: blockExtensions });
const blockTypes: ReadonlySet<string> = new Set(BLOCK_TYPES);

// A block without an id gets one, so content written headless is addressable like typed content.
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

// Makes the page equal to `json` with the smallest Yjs change (unchanged blocks keep their
// identity, so carets, authorship and other writers' edits elsewhere stay intact).
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

// Adds blocks at the end of the page: what an agent's "add entry" does.
export function appendMarkdown(doc: Y.Doc, markdown: string, origin: unknown = null): void {
  const current = docToJson(doc);
  const added = markdownToJson(markdown).content ?? [];
  writeJson(doc, { ...current, content: [...(current.content ?? []), ...added] }, origin);
}

// The change an agent sends (POST /page/:id/doc): what `edit` adds to a page it has read.
export function changeOf(doc: Y.Doc, edit: (doc: Y.Doc) => void): Uint8Array {
  const before = Y.encodeStateVector(doc);
  edit(doc);
  return Y.encodeStateAsUpdate(doc, before);
}
