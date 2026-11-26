import { describe, expect, it } from 'vitest';

import { UploadPhase } from '@/api/entitycore/queries/assets/multipart';
import { DRACO_MAX_TRIANGLES } from '@/features/entities/em-cell-mesh/viewer/engine/budget';
import {
  checkMeshFile,
  describeUploadProgress,
  GLB_MAX_BYTES,
  isObjMeshFile,
  isSameUploadStep,
  uploadFraction,
} from '@/ui/segments/contribute/em-cell-mesh/helpers';

import type { TUploadPhase } from '@/api/entitycore/queries/assets/multipart';

/** A GLB whose JSON chunk declares one primitive with `triangles` triangles, and a 4-byte binary chunk. */
function glbFile(
  triangles: number,
  { draco = true, name = 'mesh.glb', bin = true, cutBytes = 0 } = {}
): File {
  const json = new TextEncoder().encode(
    JSON.stringify({
      asset: { version: '2.0' },
      accessors: [
        { componentType: 5126, count: triangles, type: 'VEC3' },
        { componentType: 5125, count: triangles * 3, type: 'SCALAR' },
      ],
      meshes: [
        {
          primitives: [
            {
              attributes: { POSITION: 0 },
              indices: 1,
              ...(draco && {
                extensions: {
                  KHR_draco_mesh_compression: { bufferView: 0, attributes: { POSITION: 0 } },
                },
              }),
            },
          ],
        },
      ],
    })
  );
  const binChunk = new DataView(new ArrayBuffer(12));
  binChunk.setUint32(0, 4, true);
  binChunk.setUint32(4, 0x004e4942, true);
  const parts = bin ? [json, binChunk.buffer] : [json];
  const length = 20 + json.byteLength + (bin ? binChunk.byteLength : 0);
  const header = new DataView(new ArrayBuffer(20));
  header.setUint32(0, 0x46546c67, true);
  header.setUint32(4, 2, true);
  header.setUint32(8, length, true);
  header.setUint32(12, json.byteLength, true);
  header.setUint32(16, 0x4e4f534a, true);
  const whole = new Blob([header.buffer, ...parts]);
  return new File([whole.slice(0, length - cutBytes)], name, { type: 'model/gltf-binary' });
}

function withSize(file: File, size: number): File {
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('checkMeshFile', () => {
  it('accepts an OBJ with vertex lines', async () => {
    const file = new File(['# exported\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n'], 'neuron.obj');

    expect(await checkMeshFile(file)).toEqual({ error: null, notice: null });
    expect(isObjMeshFile(file)).toBe(true);
  });

  it('accepts an OBJ whose vertices come after a long header', async () => {
    const header = '# exported by a tool\n'.repeat(5_000);
    const file = new File([`${header}mtllib mesh.mtl\nv 0 0 0\n`], 'neuron.obj');

    expect(await checkMeshFile(file)).toEqual({ error: null, notice: null });
  });

  it('warns that a large OBJ will likely be above the viewer limit', async () => {
    const file = withSize(new File(['v 0 0 0\n'], 'neuron.obj'), 6 * 1024 ** 3);

    const { error, notice } = await checkMeshFile(file);

    expect(error).toBeNull();
    expect(notice).toContain('likely not displayed');
  });

  it('refuses an OBJ with no vertex line at its start', async () => {
    const { error } = await checkMeshFile(new File(['not a mesh'], 'neuron.obj'));

    expect(error).toContain('does not look like an OBJ mesh');
  });

  it('refuses a binary file whose bytes happen to hold an OBJ comment', async () => {
    const { error } = await checkMeshFile(
      new File([new Uint8Array([0, 10, 35, 32, 1])], 'neuron.obj')
    );

    expect(error).toContain('does not look like an OBJ mesh');
  });

  it.each([
    ['at its start', `${'v 0 0 0\n'.repeat(4)}f 1 2 3 4\n`],
    ['after its vertices', `${'v 0 0 0\n'.repeat(20_000)}f 1 2 3\nf 1/1 2/2 3/3 4/4 # quad\n`],
  ])('refuses an OBJ with a polygon face %s', async (_, content) => {
    const { error } = await checkMeshFile(new File([content], 'neuron.obj'));

    expect(error).toContain('faces with more than three vertices');
  });

  it('accepts triangle faces with texture and normal indices and comments', async () => {
    const file = new File(
      ['v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1/1/1 2/2/2 3/3/3 # tri\nf -3 -2 -1\n'],
      'neuron.obj'
    );

    expect(await checkMeshFile(file)).toEqual({ error: null, notice: null });
  });

  it('accepts a Draco GLB the viewer can show', async () => {
    const file = glbFile(1_000);

    expect(await checkMeshFile(file)).toEqual({ error: null, notice: null });
    expect(isObjMeshFile(file)).toBe(false);
  });

  it('accepts a Draco GLB above the viewer limit, with a notice', async () => {
    const { error, notice } = await checkMeshFile(glbFile(DRACO_MAX_TRIANGLES + 1));

    expect(error).toBeNull();
    expect(notice).toContain('stored but not displayed');
  });

  it('refuses a file that is not a GLB', async () => {
    const { error } = await checkMeshFile(new File(['PK\u0003\u0004 a zip'], 'mesh.glb'));

    expect(error).toContain('could not be validated');
  });

  it.each([
    ['cut short', { cutBytes: 2 }],
    ['without a binary chunk', { bin: false }],
  ])('refuses a GLB %s', async (_, shape) => {
    const { error } = await checkMeshFile(glbFile(1_000, shape));

    expect(error).toContain('could not be validated');
  });

  it('refuses a GLB above the GLB size limit', async () => {
    const { error } = await checkMeshFile(withSize(glbFile(10), GLB_MAX_BYTES + 1));

    expect(error).toContain('exceeds the maximum size of 500MB');
  });

  it('refuses another file type', async () => {
    const { error } = await checkMeshFile(new File(['solid'], 'mesh.stl'));

    expect(error).toContain('not an accepted file type');
  });
});

describe('upload progress', () => {
  it('counts hashing as the first tenth and then the bytes sent', () => {
    expect(
      uploadFraction({ phase: UploadPhase.Hashing, loadedBytes: 50, totalBytes: 100 })
    ).toBeCloseTo(0.05);
    expect(
      uploadFraction({ phase: UploadPhase.Uploading, loadedBytes: 50, totalBytes: 100 })
    ).toBeCloseTo(0.55);
  });

  it('describes each phase', () => {
    expect(
      describeUploadProgress({ phase: UploadPhase.Hashing, loadedBytes: 0, totalBytes: 10 })
    ).toBe('Preparing');
    expect(
      describeUploadProgress({
        phase: UploadPhase.Uploading,
        loadedBytes: 1024 ** 3,
        totalBytes: 6 * 1024 ** 3,
      })
    ).toBe('Uploading 1 GB of 6 GB');
  });

  it('renders a report only when the shown percentage or the phase changes', () => {
    const at = (phase: TUploadPhase, loaded: number) => ({
      phase,
      loadedBytes: loaded,
      totalBytes: 1000,
    });
    expect(isSameUploadStep(null, at(UploadPhase.Hashing, 0))).toBe(false);
    expect(isSameUploadStep(at(UploadPhase.Uploading, 500), at(UploadPhase.Uploading, 505))).toBe(
      true
    );
    expect(isSameUploadStep(at(UploadPhase.Uploading, 500), at(UploadPhase.Uploading, 520))).toBe(
      false
    );
    expect(isSameUploadStep(at(UploadPhase.Hashing, 1000), at(UploadPhase.Uploading, 0))).toBe(
      false
    );
  });
});
