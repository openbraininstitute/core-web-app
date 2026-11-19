// The one list of Tiptap extensions that defines what a research log page can hold. The schema,
// the markdown parser and the writer all come from it, in the browser and headless alike.
import { TableKit } from '@tiptap/extension-table';
import { TextAlign } from '@tiptap/extension-text-align';
import { UniqueID } from '@tiptap/extension-unique-id';
import { StarterKit } from '@tiptap/starter-kit';

import { Callout, Entity, Figure, FileBlock } from '@/features/logbook/blocks/nodes';

import type { AnyExtension } from '@tiptap/core';

// The Yjs shared type every page uses; the logbook server reads the same name (yjs-compute.ts).
export const FRAGMENT = 'default';

// Top-level blocks carry a stable `id`: agents name the blocks they work on (the `present`
// notice), history is asked per block, the preview highlights per block.
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

// Everything but the id plugin: the web app adds UniqueID with its collaboration filter.
export const contentExtensions: AnyExtension[] = [
  // Undo comes from Yjs in the editor (Collaboration), never from ProseMirror's history.
  StarterKit.configure({
    undoRedo: false,
    heading: { levels: [1, 2, 3] },
    link: { openOnClick: false, autolink: true },
  }),
  TableKit.configure({ table: { resizable: false } }),
  // Alignment of paragraphs and headings: a `textAlign` attribute in the page's Yjs document
  // (null, the default, means left and writes nothing). Markdown has no syntax for it, so it is
  // not in the markdown agents read or write; being in this shared schema is what keeps it when an
  // agent edits other blocks (a schema without it would drop it from every block it rewrites).
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

// The headless list (agents, server, tests): the same schema, ids included.
export const blockExtensions: AnyExtension[] = [
  ...contentExtensions,
  UniqueID.configure({ types: [...BLOCK_TYPES] }),
];
