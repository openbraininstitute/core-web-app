// One extension list for the schema and markdown, in the browser and headless.
import { TableKit } from '@tiptap/extension-table';
import { TextAlign } from '@tiptap/extension-text-align';
import { UniqueID } from '@tiptap/extension-unique-id';
import { StarterKit } from '@tiptap/starter-kit';

import { Callout, Entity, Figure, FileBlock } from '@/features/logbook/blocks/nodes';

import type { AnyExtension } from '@tiptap/core';

// The server reads the same Yjs fragment name.

// Top-level blocks carry a stable `id` so agents, history and preview can name them.
export const BLOCK_TYPES = [
  'paragraph',
  'heading',
  'bulletList',
  'orderedList',
  'blockquote',
  'codeBlock',
  'horizontalRule',
  'table',
  'entity',
  'file',
  'figure',
  'callout',
] as const;

// No id plugin: the web app adds UniqueID with its own collaboration filter.
export const contentExtensions: AnyExtension[] = [
  // Undo comes from Yjs, not ProseMirror's history.
  StarterKit.configure({
    undoRedo: false,
    heading: { levels: [1, 2, 3] },
    link: { openOnClick: false, autolink: true },
  }),
  TableKit.configure({ table: { resizable: false } }),
  // Markdown can't hold alignment; the shared schema keeps agent edits from dropping it.
  TextAlign.configure({
    types: ['heading', 'paragraph'],
    alignments: ['left', 'center', 'right', 'justify'],
    defaultAlignment: null,
  }),
  Entity,
  FileBlock,
  Figure,
  Callout,
];

// Headless list (agents, server, tests), ids included.
export const blockExtensions: AnyExtension[] = [
  ...contentExtensions,
  UniqueID.configure({ types: [...BLOCK_TYPES] }),
];
