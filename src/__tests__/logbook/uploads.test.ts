import { expect, test } from 'vitest';

import { schema } from '@/__tests__/logbook/blocks/markdown';
import { blockRange, insertedBlockId } from '@/features/logbook/log/uploads';

const PATH = 'rate.426bb8ddb825.png';
const figure = (id: string) => ({ type: 'figure', attrs: { id, src: PATH, alt: 'rate' } });
const paragraph = (id: string, text: string) => ({
  type: 'paragraph',
  attrs: { id },
  content: [{ type: 'text', text }],
});
const page = schema.nodeFromJSON({
  type: 'doc',
  content: [figure('old'), paragraph('p1', 'between'), figure('new')],
});

test('the block an upload inserted is found by the id it got, the same file elsewhere is not', () => {
  const oldSize = page.child(0).nodeSize;
  const at = oldSize + page.child(1).nodeSize;
  expect(insertedBlockId(page, at, PATH)).toBe('new');
  expect(blockRange(page, 'new')).toEqual({ from: at, to: at + page.child(2).nodeSize });
  expect(blockRange(page, 'old')).toEqual({ from: 0, to: oldSize });
});

test('when the block at the position is not the upload, or is gone, nothing is to be removed', () => {
  expect(insertedBlockId(page, page.child(0).nodeSize, PATH)).toBeNull();
  expect(insertedBlockId(page, 0, 'other.png')).toBeNull();
  expect(blockRange(page, 'gone')).toBeNull();
});
