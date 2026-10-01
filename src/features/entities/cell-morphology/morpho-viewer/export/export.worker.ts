/**
 * Writes the mesh as a file off the page's thread: a projection neuron's is a hundred megabytes, and Draco takes
 * seconds. The export starts a worker per file and terminates it after, so the encoder's memory goes with it.
 */
import * as Comlink from 'comlink';
import createEncoderModule from 'draco3dgltf/draco_encoder_gltf_nodejs.js';

import { type ExportMesh, encodeGlb } from './glb';
import { encodeStl } from './stl';

const WASM_URL = new URL('draco3dgltf/draco_encoder.wasm', import.meta.url);

async function dracoEncoder(): Promise<unknown> {
  // The Emscripten glue is Draco's Node build, which runs in a browser too once it is handed the WASM bytes.
  const response = await fetch(WASM_URL);
  if (!response.ok) throw new Error(`could not load the Draco encoder (HTTP ${response.status})`);
  const wasmBinary = await response.arrayBuffer();
  return createEncoderModule({ wasmBinary });
}

const api = {
  async glb(mesh: ExportMesh, draco: boolean): Promise<Uint8Array<ArrayBuffer>> {
    const file = await encodeGlb(mesh, draco ? await dracoEncoder() : undefined);
    return Comlink.transfer(file, [file.buffer]);
  },
  stl(positions: Float32Array, indices: Uint32Array): Uint8Array<ArrayBuffer> {
    const file = encodeStl(positions, indices);
    return Comlink.transfer(file, [file.buffer]);
  },
};

export type ExportApi = typeof api;

Comlink.expose(api);
