import { describe, expect, it } from 'vitest';

import { joinBlocks, splitBlocks } from './blocks';

describe('splitBlocks', () => {
  it('splits at blank lines and drops empty ones', () => {
    expect(splitBlocks('# A\n\n\nText\nmore\n\n- x\n- y\n')).toEqual(['# A', 'Text\nmore', '- x\n- y']);
  });

  it('keeps a fenced code block whole', () => {
    expect(splitBlocks('a\n\n```py\nx = 1\n\ny = 2\n```\n\nb')).toEqual([
      'a',
      '```py\nx = 1\n\ny = 2\n```',
      'b',
    ]);
  });

  it('round-trips', () => {
    const text = '## Q\n\nBody\n\nhttps://x/app/entity/1\n';
    expect(joinBlocks(splitBlocks(text))).toBe(text);
    expect(joinBlocks([])).toBe('');
  });
});
