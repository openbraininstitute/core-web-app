// Headless (no React, no DOM) so agents, server and browser write the same markdown.
import { Node } from '@tiptap/core';
import { isNil } from 'es-toolkit';
import get from 'es-toolkit/compat/get';

import { CalloutKind, calloutKindOf } from '@/features/logbook/blocks/kinds';

import type { MarkdownToken, MarkdownTokenizer } from '@tiptap/core';

// `{type=circuit id=c-3f2a}`: space-separated key=value pairs, values without spaces.
export function parseDirectiveAttributes(raw: string): Record<string, string> {
  const pairs = raw.trim().split(/\s+/).filter(Boolean);
  return Object.fromEntries(
    pairs.map((pair) => {
      const at = pair.indexOf('=');
      return at < 0 ? [pair, ''] : [pair.slice(0, at), pair.slice(at + 1)];
    })
  );
}

const startOf =
  (marker: string) =>
  (src: string): number =>
    src.indexOf(marker);

// One whole line: `::name[label]{attributes}`.
function directiveTokenizer(name: string): MarkdownTokenizer {
  const line = new RegExp(`^::${name}\\[([^\\]\\n]*)\\]\\{([^}\\n]*)\\}[ \\t]*(?:\\n|$)`);
  return {
    name,
    level: 'block',
    start: startOf(`::${name}[`),
    tokenize(src) {
      const match = line.exec(src);
      if (isNil(match)) return undefined;
      return {
        type: name,
        raw: match[0],
        label: match[1] ?? '',
        attributes: parseDirectiveAttributes(match[2] ?? ''),
      };
    },
  };
}

const attributesOf = (token: MarkdownToken): Record<string, string> =>
  get(token, 'attributes') ?? {};
const labelOf = (token: MarkdownToken): string => String(get(token, 'label') ?? '');

// A platform entity: `::entity[CA1 microcircuit]{type=circuit id=c-3f2a}`.
export const Entity = Node.create({
  name: 'entity',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes: () => ({
    label: { default: '' },
    type: { default: 'entity' },
    entityId: { default: '' },
  }),
  parseHTML: () => [
    {
      tag: 'div[data-entity]',
      getAttrs: (el) => ({
        label: el.textContent ?? '',
        type: el.getAttribute('data-type') ?? 'entity',
        entityId: el.getAttribute('data-entity') ?? '',
      }),
    },
  ],
  renderHTML: ({ node }) => [
    'div',
    { 'data-entity': node.attrs['entityId'], 'data-type': node.attrs['type'] },
    String(node.attrs['label']),
  ],
  markdownTokenName: 'entity',
  markdownTokenizer: directiveTokenizer('entity'),
  parseMarkdown: (token) => {
    const attributes = attributesOf(token);
    return {
      type: 'entity',
      attrs: {
        label: labelOf(token),
        type: attributes['type'] ?? 'entity',
        entityId: attributes['id'] ?? '',
      },
    };
  },
  renderMarkdown: (node) =>
    `::entity[${node.attrs?.['label'] ?? ''}]{type=${node.attrs?.['type'] ?? 'entity'} id=${node.attrs?.['entityId'] ?? ''}}`,
});

// A file of the log: `::file[firing_rate.py]{path=code/firing_rate.py}`.
export const FileBlock = Node.create({
  name: 'file',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes: () => ({ name: { default: '' }, path: { default: '' } }),
  parseHTML: () => [
    {
      tag: 'div[data-file]',
      getAttrs: (el) => ({
        name: el.textContent ?? '',
        path: el.getAttribute('data-file') ?? '',
      }),
    },
  ],
  renderHTML: ({ node }) => [
    'div',
    { 'data-file': node.attrs['path'] },
    String(node.attrs['name']),
  ],
  markdownTokenName: 'file',
  markdownTokenizer: directiveTokenizer('file'),
  parseMarkdown: (token) => ({
    type: 'file',
    attrs: { name: labelOf(token), path: attributesOf(token)['path'] ?? labelOf(token) },
  }),
  renderMarkdown: (node) =>
    `::file[${node.attrs?.['name'] ?? ''}]{path=${node.attrs?.['path'] ?? ''}}`,
});

// An image on its own line: `![Firing rate](plots/firing-rate.png)`, drawn as a figure.
const FIGURE_LINE = /^!\[([^\]\n]*)\]\(([^)\s]+)\)[ \t]*(?:\n|$)/;
export const Figure = Node.create({
  name: 'figure',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes: () => ({ src: { default: '' }, alt: { default: '' } }),
  parseHTML: () => [
    {
      tag: 'figure img[src]',
      getAttrs: (el) => ({ src: el.getAttribute('src') ?? '', alt: el.getAttribute('alt') ?? '' }),
    },
  ],
  renderHTML: ({ node }) => [
    'figure',
    ['img', { src: node.attrs['src'], alt: node.attrs['alt'] }],
    ['figcaption', String(node.attrs['alt'])],
  ],
  markdownTokenName: 'figure',
  markdownTokenizer: {
    name: 'figure',
    level: 'block',
    start: startOf('!['),
    tokenize(src) {
      const match = FIGURE_LINE.exec(src);
      if (isNil(match)) return undefined;
      return { type: 'figure', raw: match[0], alt: match[1] ?? '', src: match[2] ?? '' };
    },
  },
  parseMarkdown: (token) => ({
    type: 'figure',
    attrs: { alt: String(get(token, 'alt') ?? ''), src: String(get(token, 'src') ?? '') },
  }),
  renderMarkdown: (node) => `![${node.attrs?.['alt'] ?? ''}](${node.attrs?.['src'] ?? ''})`,
});

// A callout: `> [!NOTE] text` (GitHub alert form, one line).
const CALLOUT_LINE = /^>[ \t]*\[!(\w+)\][ \t]*([^\n]*)(?:\n|$)/;
export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'inline*',
  defining: true,
  addAttributes: () => ({ kind: { default: CalloutKind.Note } }),
  parseHTML: () => [
    {
      tag: 'aside[data-callout]',
      getAttrs: (el) => ({ kind: calloutKindOf(el.getAttribute('data-callout') ?? '') }),
    },
  ],
  renderHTML: ({ node }) => ['aside', { 'data-callout': node.attrs['kind'] }, 0],
  markdownTokenName: 'callout',
  markdownTokenizer: {
    name: 'callout',
    level: 'block',
    start: startOf('> [!'),
    tokenize(src, _tokens, lexer) {
      const match = CALLOUT_LINE.exec(src);
      if (isNil(match)) return undefined;
      return {
        type: 'callout',
        raw: match[0],
        kind: calloutKindOf(match[1] ?? ''),
        tokens: lexer.inlineTokens(match[2] ?? ''),
      };
    },
  },
  parseMarkdown: (token, helpers) => ({
    type: 'callout',
    attrs: { kind: calloutKindOf(String(get(token, 'kind') ?? '')) },
    content: helpers.parseInline(token.tokens ?? []),
  }),
  renderMarkdown: (node, helpers) =>
    `> [!${String(node.attrs?.['kind'] ?? CalloutKind.Note).toUpperCase()}] ${helpers.renderChildren(node.content ?? [])}`,
});
