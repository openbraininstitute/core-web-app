import { StepMap } from '@tiptap/pm/transform';
import { describe, expect, test } from 'vitest';

import { markdownToJson, schema } from '@/features/logbook/blocks/markdown';
import { UNKNOWN_ACTOR } from '@/features/logbook/collaboration/actors';
import { ChangeFeed, diffOf, summaryOf } from '@/features/logbook/collaboration/changes';

const docOf = (markdown: string) => schema.nodeFromJSON(markdownToJson(markdown));
const withIdsOf = (from: ReturnType<typeof docOf>, markdown: string) => {
  const json = markdownToJson(markdown);
  json.content = (json.content ?? []).map((block, i) => ({
    ...block,
    attrs: { ...block.attrs, id: from.child(i).attrs['id'] },
  }));
  return schema.nodeFromJSON(json);
};

describe('what a change did', () => {
  const before = docOf('# Log\n\n## Methods\n\nEach cell received a step.');

  test('one typed word is the word, not the paragraph', () => {
    const after = withIdsOf(before, '# Log\n\n## Methods\n\nEach cell received a long step.');
    const diff = diffOf(before, after);
    expect(diff).not.toBeNull();
    expect(after.textBetween(diff?.from ?? 0, diff?.to ?? 0)).toBe('long ');
    expect(diff?.removed).toBe('');
    expect(summaryOf(after, diff?.from ?? 0, diff?.to ?? 0, '')).toBe('edited Methods');
  });

  test('a replaced phrase keeps what it replaced', () => {
    const after = withIdsOf(before, '# Log\n\n## Methods\n\nEach cell received a pulse.');
    const diff = diffOf(before, after);
    expect(diff?.removed).toBe('step');
    expect(summaryOf(after, diff?.from ?? 0, diff?.to ?? 0, diff?.removed ?? '')).toBe(
      'reworded a sentence in Methods'
    );
  });

  test('an added block is named in the design words', () => {
    const after = schema.nodeFromJSON({
      ...before.toJSON(),
      content: [
        ...before.toJSON().content,
        ...(markdownToJson('::entity[CA1]{type=circuit id=c-1}').content ?? []),
      ],
    });
    const diff = diffOf(before, after);
    expect(summaryOf(after, diff?.from ?? 0, diff?.to ?? 0, '')).toBe('linked the circuit');
  });

  test('no change, no diff', () => {
    expect(diffOf(before, before)).toBeNull();
  });
});

test('a change keeps pointing at its text after an edit above it', () => {
  const feed = new ChangeFeed();
  feed.push({
    id: 1,
    actor: { ...UNKNOWN_ACTOR, agent: true },
    local: false,
    at: 0,
    from: 10,
    to: 20,
    blockId: 'b1',
    summary: 'reworded a sentence',
    removed: 'old',
  });
  feed.remap(new StepMap([0, 0, 5]));
  expect(feed.snapshot().events.map((e) => [e.from, e.to])).toEqual([[15, 25]]);
  expect([feed.snapshot().toast?.from, feed.snapshot().toast?.to]).toEqual([15, 25]);
  const before = feed.snapshot();
  feed.remap(new StepMap([40, 0, 3]));
  expect(feed.snapshot()).toBe(before);
});
