import { File as H5File, ready } from 'h5wasm';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { NodesSession } from '@/features/circuit-nodes/worker/nodes-h5';

const POPULATION = 'cortex';

type NodeColumns = {
  /** Written as a `@library`-encoded categorical, the way SONATA usually ships it. */
  morphology?: string[];
  orientation?: boolean;
};

/**
 * Write a throwaway SONATA nodes file into the WASM FS and hand back its name.
 *
 * Real files rather than a stubbed reader: the behaviour under test is which
 * datasets `getGeometry` touches, and a stub would be asserting against my own
 * idea of h5wasm rather than h5wasm.
 */
function writeNodesFile(
  name: string,
  count: number,
  { morphology, orientation }: NodeColumns = {}
) {
  const file = new H5File(name, 'w');
  const base = `/nodes/${POPULATION}/0`;
  const range = Array.from({ length: count }, (_, i) => i);

  // h5wasm does not create intermediate groups for a nested dataset path.
  file.create_group('nodes');
  file.create_group(`nodes/${POPULATION}`);
  file.create_group(base);

  file.create_dataset({ name: `${base}/x`, data: range.map((i) => i * 10) });
  file.create_dataset({ name: `${base}/y`, data: range.map((i) => i * 10 + 1) });
  file.create_dataset({ name: `${base}/z`, data: range.map((i) => i * 10 + 2) });

  if (orientation) {
    for (const axis of ['x', 'y', 'z']) {
      file.create_dataset({ name: `${base}/orientation_${axis}`, data: range.map(() => 0) });
    }
    file.create_dataset({ name: `${base}/orientation_w`, data: range.map(() => 1) });
  }

  if (morphology) {
    const library = [...new Set(morphology)];
    file.create_dataset({
      name: `${base}/morphology`,
      data: morphology.map((m) => library.indexOf(m)),
    });
    file.create_group(`${base}/@library`);
    file.create_dataset({ name: `${base}/@library/morphology`, data: library });
  }

  file.close();
  return name;
}

let openSession: NodesSession | null = null;
let openFile: string | null = null;

function open(name: string): NodesSession {
  openSession = new NodesSession(name, POPULATION);
  openFile = name;
  return openSession;
}

beforeAll(async () => {
  await ready;
});

afterEach(async () => {
  openSession?.close();
  openSession = null;
  if (openFile) {
    const { FS } = await ready;
    FS.unlink(openFile);
    openFile = null;
  }
});

describe('NodesSession.getGeometry', () => {
  it('packs positions into a flat array in file order', () => {
    const session = open(writeNodesFile('positions.h5', 3));
    const geometry = session.getGeometry();

    expect(geometry.count).toBe(3);
    expect(Array.from(geometry.positions)).toEqual([0, 1, 2, 10, 11, 12, 20, 21, 22]);
  });

  it('leaves the morphology column unread unless asked for it', () => {
    const session = open(
      writeNodesFile('unasked.h5', 3, { morphology: ['a.swc', 'b.swc', 'a.swc'] })
    );

    // The somas-only viewer never resolves a morphology file, and decoding this
    // column costs one JS string per node — so the default has to be off even
    // when the column is right there.
    expect(session.getGeometry().morphologies).toBeNull();
  });

  it('decodes @library-encoded morphology names when asked', () => {
    const session = open(
      writeNodesFile('asked.h5', 3, { morphology: ['a.swc', 'b.swc', 'a.swc'] })
    );

    expect(session.getGeometry({ withMorphologies: true }).morphologies).toEqual([
      'a.swc',
      'b.swc',
      'a.swc',
    ]);
  });

  it('returns null morphologies when the population has no morphology column', () => {
    const session = open(writeNodesFile('bare.h5', 2));

    expect(session.getGeometry({ withMorphologies: true }).morphologies).toBeNull();
  });

  it('leaves the orientation columns unread unless asked for them', () => {
    const session = open(writeNodesFile('unasked-quat.h5', 2, { orientation: true }));

    // Same reasoning as the morphology column: a somas-only viewer never turns a
    // cell, and packing these costs a `count * 4` Float32Array to transfer and
    // drop, 64 MB on a four-million-node circuit.
    expect(session.getGeometry().orientations).toBeNull();
  });

  it('packs orientations only when all four components are present', () => {
    const withQuat = open(writeNodesFile('quat.h5', 2, { orientation: true }));
    expect(Array.from(withQuat.getGeometry({ withOrientations: true }).orientations ?? [])).toEqual(
      [0, 0, 0, 1, 0, 0, 0, 1]
    );
  });

  it('reports no orientation for a population that declares none', () => {
    const session = open(writeNodesFile('noquat.h5', 2));
    expect(session.getGeometry({ withOrientations: true }).orientations).toBeNull();
  });

  it('refuses to place a population whose coordinates are not numbers', () => {
    const file = new H5File('strpos.h5', 'w');
    file.create_group('nodes');
    file.create_group(`nodes/${POPULATION}`);
    file.create_group(`nodes/${POPULATION}/0`);
    const base = `/nodes/${POPULATION}/0`;
    // A `Float32Array` write runs ToNumber on what it is handed, so reading this
    // without checking the kind would draw the whole population at NaN rather
    // than say it cannot be drawn.
    file.create_dataset({ name: `${base}/x`, data: ['a', 'b'] });
    file.create_dataset({ name: `${base}/y`, data: [1, 2] });
    file.create_dataset({ name: `${base}/z`, data: [3, 4] });
    file.close();

    const session = open('strpos.h5');
    expect(() => session.getGeometry()).toThrow('has no x/y/z columns');
  });

  it('names the population when it cannot be placed at all', () => {
    const file = new H5File('nopos.h5', 'w');
    file.create_group('nodes');
    file.create_group(`nodes/${POPULATION}`);
    file.create_group(`nodes/${POPULATION}/0`);
    file.create_dataset({ name: `/nodes/${POPULATION}/0/morphology`, data: [0, 0] });
    file.close();

    const session = open('nopos.h5');
    expect(() => session.getGeometry()).toThrow(/has no x\/y\/z columns/);
  });
});
