import { describe, expect, it } from 'vitest';

import {
  indexOfNodeKey,
  makeNodeKey,
  makeVizCellId,
} from '@/features/scan-config/components/circuit-viz/sources/node-key';

describe('node key', () => {
  it('round-trips the node index', () => {
    expect(indexOfNodeKey(makeNodeKey('circuit-id', 42))).toBe(42);
  });

  it('round-trips the node index through a viewer id too', () => {
    expect(indexOfNodeKey(makeVizCellId(makeNodeKey('circuit-id', 42), true))).toBe(42);
  });

  it('gives axon-on and axon-off cells distinct viewer ids', () => {
    const key = makeNodeKey('circuit-id', 0);

    expect(makeVizCellId(key, true)).not.toBe(makeVizCellId(key, false));
  });

  // Number('') is 0, so a key with no index must not read as node 0 — that
  // would load a different cell's morphology with no sign anything went wrong.
  it.each([
    'circuit-id #',
    'circuit-id',
    '',
    '#-1',
    'circuit-id #1x',
    'circuit-id #?axons=true',
  ])('rejects %o rather than defaulting to node 0', (key) => {
    expect(indexOfNodeKey(key)).toBeNull();
  });
});
