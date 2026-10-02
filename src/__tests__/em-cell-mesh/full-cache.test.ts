// @vitest-environment node
import { MeshoptDecoder } from 'meshoptimizer/decoder';
import { MeshoptEncoder } from 'meshoptimizer/encoder';
import { beforeAll, describe, expect, it } from 'vitest';

import { packMesh } from '@/features/entities/em-cell-mesh/viewer/engine/chunks';
import {
  decodeFull,
  encodeChunk,
  encodeFull,
  FULL_VERSION,
} from '@/features/entities/em-cell-mesh/viewer/engine/full-cache';

import { torus } from './mesh-fixtures';

beforeAll(async () => {
  await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
});

/** A chunk's triangles, each from its smallest corner: the index codec may start a triangle at another. */
function triangles(indices: Uint16Array): string[] {
  const out: string[] = [];
  for (let t = 0; t < indices.length; t += 3) {
    const tri = [indices[t], indices[t + 1], indices[t + 2]];
    const k = tri.indexOf(Math.min(...tri));
    out.push([0, 1, 2].map((i) => tri[(k + i) % 3]).join(','));
  }
  return out.sort();
}

describe('the full mesh cache', () => {
  const { positions, indices } = torus(200, 100, { centre: [0, 0, 0] });
  const mesh = packMesh(
    positions.map((p) => p / 1000),
    null,
    indices,
    { triangles: 8000, vertices: 65535 }
  ).mesh;

  it('gives back the packed mesh it was given, smaller', () => {
    const { chunks, ...rest } = mesh;
    const encoded = chunks.map((c) => encodeChunk(MeshoptEncoder, c));
    const buffer = encodeFull(rest, encoded);
    const raw = chunks.reduce(
      (n, c) => n + c.positions.byteLength + c.normals.byteLength + c.indices.byteLength,
      0
    );
    expect(buffer.byteLength).toBeLessThan(raw / 2);
    const back = decodeFull(MeshoptDecoder, buffer);
    expect(back).toMatchObject(rest);
    back?.chunks.forEach((c, i) => {
      expect(c.origin).toEqual(chunks[i].origin);
      expect(c.bounds).toEqual(chunks[i].bounds);
      expect(c.positions).toEqual(chunks[i].positions);
      expect(c.normals).toEqual(chunks[i].normals);
      expect(triangles(c.indices)).toEqual(triangles(chunks[i].indices));
    });
  });

  it('gives back nothing from an entry of another version', () => {
    const { chunks, ...rest } = mesh;
    const buffer = encodeFull(
      rest,
      chunks.map((c) => encodeChunk(MeshoptEncoder, c))
    );
    const length = new DataView(buffer).getUint32(0, true);
    const json = new TextDecoder().decode(new Uint8Array(buffer, 4, length));
    const other = new TextEncoder().encode(
      json.replace(FULL_VERSION, 'pack-0'.padEnd(FULL_VERSION.length))
    );
    new Uint8Array(buffer, 4, length).set(other);
    expect(decodeFull(MeshoptDecoder, buffer)).toBeNull();
  });
});
