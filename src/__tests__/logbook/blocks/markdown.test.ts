import { describe, expect, test } from 'vitest';
import * as Y from 'yjs';

import { colourOf, fnv1a } from '@/features/logbook/blocks/colour';

import {
  appendMarkdown,
  changeOf,
  docToJson,
  docToMarkdown,
  markdownToJson,
  writeJson,
  writeMarkdown,
} from './markdown';

const LOG = [
  '# HCN block in CA1',
  '## Methods',
  'Each cell received a **500 ms** current step, repeated with ten seeds.',
  '::entity[CA1 microcircuit]{type=circuit id=c-3f2a}',
  '::file[firing_rate.py]{path=code/firing_rate.py}',
  '![Firing rate, control against HCN block](plots/firing-rate.png)',
  '> [!WARNING] The rates come from one morphology only.',
  '- Ten seeds only.',
  '| Condition | Rate (Hz) |\n| --- | --- |\n| Control | 12.1 |',
  '```python\nrates = {"control": 12.1}\n```',
].join('\n\n');

describe('markdown and the page', () => {
  test('every custom block parses to its node', () => {
    const types = (markdownToJson(LOG).content ?? []).map((block) => block.type);
    expect(types).toEqual([
      'heading',
      'heading',
      'paragraph',
      'entity',
      'file',
      'figure',
      'callout',
      'bulletList',
      'table',
      'codeBlock',
    ]);
  });

  test('every top-level block gets an id', () => {
    const ids = (markdownToJson(LOG).content ?? []).map((block) => block.attrs?.['id']);
    expect(ids.every((id) => typeof id === 'string' && id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('a page written from markdown reads back as the same markdown', () => {
    const doc = new Y.Doc();
    writeMarkdown(doc, LOG);
    const once = docToMarkdown(doc);
    for (const line of [
      '::entity[CA1 microcircuit]{type=circuit id=c-3f2a}',
      '::file[firing_rate.py]{path=code/firing_rate.py}',
      '![Firing rate, control against HCN block](plots/firing-rate.png)',
      '> [!WARNING] The rates come from one morphology only.',
      'Each cell received a **500 ms** current step, repeated with ten seeds.',
    ])
      expect(once).toContain(line);
    const again = new Y.Doc();
    writeMarkdown(again, once);
    expect(docToMarkdown(again)).toBe(once);
  });

  test("an agent's append is a small change that keeps the existing blocks", () => {
    const doc = new Y.Doc();
    writeMarkdown(doc, LOG);
    const other = new Y.Doc();
    Y.applyUpdate(other, Y.encodeStateAsUpdate(doc));
    const before = docToJson(doc).content ?? [];
    const change = changeOf(doc, (d) => appendMarkdown(d, '## Caveats\n\n- One morphology.'));
    const after = docToJson(doc).content ?? [];
    expect(after.slice(0, before.length)).toEqual(before);
    expect(after.length).toBe(before.length + 2);
    expect(change.length).toBeLessThan(Y.encodeStateAsUpdate(doc).length / 2);
    Y.applyUpdate(other, change);
    expect(docToMarkdown(other)).toBe(docToMarkdown(doc));
  });
});

describe('awkward names through markdown', () => {
  const ROUND_TRIP = [
    { type: 'file', attrs: { name: 'My data.csv', path: 'My data.0123456789ab.csv' } },
    {
      type: 'figure',
      attrs: {
        alt: 'A screenshot',
        src: 'Screenshot 2026-11-20 at 10.00.00.0123456789ab.png',
      },
    },
    { type: 'entity', attrs: { label: 'Rates [Hz] at 37 °C', type: 'circuit', entityId: 'c-1' } },
    { type: 'file', attrs: { name: 'say "hi".txt', path: 'say "hi".0123456789ab.txt' } },
  ];

  test.each(
    ROUND_TRIP
  )('a $type block keeps its names when an agent writes the page back', (block) => {
    const doc = new Y.Doc();
    writeJson(doc, { type: 'doc', content: [block] });
    const again = new Y.Doc();
    writeMarkdown(again, docToMarkdown(doc));
    const [read] = docToJson(again).content ?? [];
    expect(read?.type).toBe(block.type);
    expect(read?.attrs).toMatchObject(block.attrs);
  });

  test('a note with a line break stays one note', () => {
    const doc = new Y.Doc();
    writeJson(doc, {
      type: 'doc',
      content: [
        {
          type: 'callout',
          attrs: { kind: 'warning' },
          content: [
            { type: 'text', text: 'first line' },
            { type: 'hardBreak' },
            { type: 'text', text: 'second line' },
          ],
        },
      ],
    });
    const again = new Y.Doc();
    writeMarkdown(again, docToMarkdown(doc));
    const blocks = docToJson(again).content ?? [];
    expect(blocks.map((b) => b.type)).toEqual(['callout']);
    expect(blocks[0]?.content?.map((c) => c.type)).toEqual(['text', 'hardBreak', 'text']);
  });

  test('the old forms agents already wrote still read', () => {
    const blocks =
      markdownToJson(
        '::file[a.csv]{path=data/a.csv}\n\n![plot](plots/a.png)\n\n::entity[CA1]{type=circuit id=c-1}'
      ).content ?? [];
    expect(
      blocks.map((b) => [b.type, b.attrs?.['path'] ?? b.attrs?.['src'] ?? b.attrs?.['entityId']])
    ).toEqual([
      ['file', 'data/a.csv'],
      ['figure', 'plots/a.png'],
      ['entity', 'c-1'],
    ]);
  });
});

describe('alignment', () => {
  // Markdown can't show textAlign, but an agent's write must keep it.
  test('an aligned block keeps its alignment through an agent write, and markdown does not show it', () => {
    const doc = new Y.Doc();
    writeMarkdown(doc, '# Title\n\nCentred text.');
    const page = docToJson(doc);
    writeJson(doc, {
      ...page,
      content: (page.content ?? []).map((block) =>
        block.type === 'paragraph'
          ? { ...block, attrs: { ...block.attrs, textAlign: 'center' } }
          : block
      ),
    });
    appendMarkdown(doc, 'Added by an agent.');
    const aligns = (docToJson(doc).content ?? []).map(
      (block) => block.attrs?.['textAlign'] ?? null
    );
    expect(aligns).toEqual([null, 'center', null]);
    expect(docToMarkdown(doc)).toContain('Centred text.');
    expect(docToMarkdown(doc)).not.toContain('center');
  });
});

describe('colour', () => {
  test('FNV-1a matches its published test values', () => {
    expect(fnv1a('')).toBe(0x811c9dc5);
    expect(fnv1a('a')).toBe(0xe40c292c);
    expect(fnv1a('foobar')).toBe(0xbf9cf968);
  });

  test('a user id always gives the same colour', () => {
    const id = 'b9a3c3c0-7f0e-4d3a-9e43-3f1d2a9b8c11';
    expect(colourOf(id)).toBe(colourOf(id));
    expect(colourOf(id)).toMatch(/^#[0-9a-f]{6}$/);
  });
});
