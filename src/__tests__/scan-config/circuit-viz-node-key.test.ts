import { describe, expect, it } from 'vitest';

import {
  makeNodeKey,
  makeVizCellId,
  parseNodeKey,
} from '@/features/scan-config/components/circuit-viz/sources/node-key';

describe('node key', () => {
  it('round-trips the population and node index', () => {
    expect(parseNodeKey(makeNodeKey('circuit-id', 'cortex', 42))).toEqual({
      population: 'cortex',
      index: 42,
    });
  });

  it('round-trips them through a viewer id too', () => {
    const id = makeVizCellId(makeNodeKey('circuit-id', 'cortex', 42), {
      showAxons: true,
      somaOnly: true,
    });

    expect(parseNodeKey(id)).toEqual({ population: 'cortex', index: 42 });
  });

  // A population name is free text short of `/`, so a space or a hash in one
  // must not be mistaken for the index.
  it('reads a population name with a space and a hash in it', () => {
    expect(parseNodeKey(makeNodeKey('circuit-id', 'layer #1 cells', 7))).toEqual({
      population: 'layer #1 cells',
      index: 7,
    });
  });

  it('gives axon-on and axon-off cells distinct viewer ids', () => {
    const key = makeNodeKey('circuit-id', 'cortex', 0);

    expect(makeVizCellId(key, { showAxons: true })).not.toBe(
      makeVizCellId(key, { showAxons: false })
    );
  });

  // Selecting a population turns its somas into morphologies, and the viewer
  // only re-requests cells whose id changed.
  it('gives a soma-only cell a different viewer id from the same cell drawn in full', () => {
    const key = makeNodeKey('circuit-id', 'cortex', 0);

    expect(makeVizCellId(key, { showAxons: true, somaOnly: true })).not.toBe(
      makeVizCellId(key, { showAxons: true })
    );
  });

  // Number('') is 0, so a key with no index must not read as node 0 — that
  // would load a different cell's morphology with no sign anything went wrong.
  it.each([
    'circuit-id/cortex #',
    'circuit-id/cortex',
    'circuit-id #4',
    '',
    'circuit-id/cortex #-1',
    'circuit-id/cortex #1x',
    'circuit-id/cortex #?axons=true',
  ])('rejects %o rather than defaulting to node 0', (key) => {
    expect(parseNodeKey(key)).toBeNull();
  });
});
