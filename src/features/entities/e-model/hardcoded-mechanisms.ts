import fs from 'fs/promises';
import path from 'path';

/**
 * Older e-models have their mechanisms distribution shipped with the app as
 * `public/emodel-channels-location/<name>.json` instead of an optimisation campaign behind them.
 * Those keep the legacy configuration view.
 */
export async function hasHardcodedMechanisms(emodelName: string) {
  // basename: the name comes from the backend and must not walk out of the folder
  const file = path.join(
    process.cwd(),
    'public',
    'emodel-channels-location',
    `${path.basename(emodelName)}.json`
  );
  return fs.access(file).then(
    () => true,
    () => false
  );
}
