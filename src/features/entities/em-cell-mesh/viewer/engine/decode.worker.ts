/** Downloads the GLB into its cache and decodes it with Draco; terminated after, which frees Draco's memory. */
import * as Comlink from 'comlink';
import createDecoderModule from 'draco3dgltf/draco_decoder_gltf_nodejs.js';

import { GLB_CACHE } from './asset-cache';
import { createDecodeApi } from './worker-apis';

const WASM_URL = new URL('draco3dgltf/draco_decoder_gltf.wasm', import.meta.url);

async function loadDraco(): Promise<unknown> {
  // The Emscripten glue is Draco's Node build, which runs in a browser too once it is handed the WASM bytes.
  const response = await fetch(WASM_URL);
  if (!response.ok) throw new Error(`could not load the Draco decoder (HTTP ${response.status})`);
  return createDecoderModule({ wasmBinary: await response.arrayBuffer() });
}

Comlink.expose(createDecodeApi(loadDraco, GLB_CACHE));
