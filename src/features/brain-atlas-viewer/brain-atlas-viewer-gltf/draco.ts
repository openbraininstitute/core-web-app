import { setLoaderOptions } from '@loaders.gl/core';

const DRACO_ASSETS_PATH = '/draco';

let configured = false;

/**
 * `@tolokoban/tgd` parses GLB files with loaders.gl, which by default fetches the Draco
 * worker from unpkg.com and the decoder from gstatic.com. Point it to the copies served
 * from `public/draco` (see the README there) to avoid those third-party round trips.
 *
 * The decoder files are resolved through `CDN` because loaders.gl overrides `modules`
 * inside its workers. It must be an absolute URL, hence the browser-only origin lookup.
 */
export function configureLocalDracoDecoder() {
  if (configured) return;
  configured = true;
  setLoaderOptions({
    useLocalLibraries: true,
    CDN: `${window.location.origin}${DRACO_ASSETS_PATH}`,
    draco: { workerUrl: `${DRACO_ASSETS_PATH}/draco-worker.js` },
  });
}
