import { describe, expect, it } from 'vitest';

import { DRACO_MAX_TRIANGLES } from '@/features/entities/em-cell-mesh/viewer/engine/budget';
import {
  checkMeshFile,
  describeUploadProgress,
  GLB_MAX_BYTES,
  isObjMeshFile,
  uploadFraction,
} from '@/ui/segments/contribute/em-cell-mesh/helpers';

/** A GLB holding only its JSON chunk: one primitive with `triangles` triangles. */
function glbFile(triangles: number, { draco = true, name = 'mesh.glb' } = {}): File {
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
  const header = new DataView(new ArrayBuffer(20));
  header.setUint32(0, 0x46546c67, true);
  header.setUint32(4, 2, true);
  header.setUint32(8, 20 + json.byteLength, true);
  header.setUint32(12, json.byteLength, true);
  header.setUint32(16, 0x4e4f534a, true);
  return new File([header.buffer, json], name, { type: 'model/gltf-binary' });
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

  it('refuses an OBJ with no vertex line at its start', async () => {
    const { error } = await checkMeshFile(new File(['not a mesh'], 'neuron.obj'));

    expect(error).toContain('does not look like an OBJ mesh');
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

  it('refuses a GLB above the GLB size limit', async () => {
    const { error } = await checkMeshFile(withSize(glbFile(10), GLB_MAX_BYTES + 1));

    expect(error).toContain('exceeds the maximum size of 500 MB');
  });

  it('refuses another file type', async () => {
    const { error } = await checkMeshFile(new File(['solid'], 'mesh.stl'));

    expect(error).toContain('not an accepted file type');
  });
});

describe('upload progress', () => {
  it('counts hashing as the first tenth and then the bytes sent', () => {
    expect(uploadFraction({ phase: 'hashing', loadedBytes: 50, totalBytes: 100 })).toBeCloseTo(
      0.05
    );
    expect(uploadFraction({ phase: 'uploading', loadedBytes: 50, totalBytes: 100 })).toBeCloseTo(
      0.55
    );
  });

  it('describes each phase', () => {
    expect(describeUploadProgress({ phase: 'hashing', loadedBytes: 0, totalBytes: 10 })).toBe(
      'Preparing'
    );
    expect(
      describeUploadProgress({
        phase: 'uploading',
        loadedBytes: 1024 ** 3,
        totalBytes: 6 * 1024 ** 3,
      })
    ).toBe('Uploading 1 GB of 6 GB');
  });
});
