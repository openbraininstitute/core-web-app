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
} from '@/features/logbook/blocks/markdown';

// The design's seed log, in the markdown agents write.
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
    // Stable: a second trip changes nothing.
    const again = new Y.Doc();
    writeMarkdown(again, once);
    expect(docToMarkdown(again)).toBe(once);
  });

  test("an agent's append is a small change that keeps the existing blocks", () => {
    const doc = new Y.Doc();
    writeMarkdown(doc, LOG);
    // Another screen holding the page as it was.
    const other = new Y.Doc();
    Y.applyUpdate(other, Y.encodeStateAsUpdate(doc));
    const before = docToJson(doc).content ?? [];
    const change = changeOf(doc, (d) => appendMarkdown(d, '## Caveats\n\n- One morphology.'));
    const after = docToJson(doc).content ?? [];
    expect(after.slice(0, before.length)).toEqual(before);
    expect(after.length).toBe(before.length + 2);
    expect(change.length).toBeLessThan(Y.encodeStateAsUpdate(doc).length / 2);
    // The change alone brings the other screen to the same page.
    Y.applyUpdate(other, change);
    expect(docToMarkdown(other)).toBe(docToMarkdown(doc));
  });
});

describe('alignment', () => {
  // A person centres a paragraph; an agent then adds a block. The headless schema knows
  // `textAlign`, so the agent's write keeps it; markdown has no syntax for it and shows none.
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
