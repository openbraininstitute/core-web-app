import {
  ELECTRODE_LOCATIONS_CONFIG_KEY,
  hasElectrodeLocationsDictionary,
} from '@/features/scan-config/components/model-preview/electrode-locations-overlay';

import type { Config, ConfigValue } from '@/features/scan-config/types';
import type { MorphoViewerOverlayTransformEvent } from '@/morpho-viewer';

const COORD_DECIMALS = 3;
const ANGLE_DECIMALS = 2;

/**
 * Round a number to a fixed decimal precision for form fields.
 *
 * Why: 3D drag produces noisy floats; the form should stay readable and stable.
 */
function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Normalize degrees into `[0, 360)`. */
function wrapDegrees(value: number): number {
  const wrapped = value % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

/**
 * Write a scalar config field, leaving parameter-sweep arrays untouched.
 *
 * Why: some blocks store `origin_x: [10]` for sweeps; overwriting with a plain
 * number would break that mode.
 *
 * @param current - Existing field value
 * @param next - New scalar from the 3D gesture
 */
function nextScalar(current: unknown, next: number): ConfigValue {
  if (Array.isArray(current)) return current as ConfigValue;
  return next;
}

/**
 * Apply a morphoviewer overlay drag/rotate back into scan-config.
 *
 * How: called from `CircuitPreview` only on `event.phase === 'end'` so mid-drag
 * React updates do not fight the live WebGL buffers. Only updates `origin_*` /
 * `rotation_*` keys that already exist on the block.
 * Why: Linear probes expose Rx/Rz only; planar arrays may also have Ry — never
 * invent fields the schema did not declare.
 *
 * @param config - Full scan-config root
 * @param event - Overlay transform from morphoviewer (`id`, origin, rotation)
 * @returns New config object, or the same reference when nothing applies
 *
 * @example
 * setConfig((prev) => applyElectrodeOverlayTransform(prev, event));
 */
export function applyElectrodeOverlayTransform(
  config: Config,
  event: MorphoViewerOverlayTransformEvent
): Config {
  const dictionary = config[ELECTRODE_LOCATIONS_CONFIG_KEY];
  if (!hasElectrodeLocationsDictionary(dictionary)) return config;

  const block = dictionary[event.id];
  if (!block || typeof block !== 'object' || Array.isArray(block)) return config;

  const current = block as Record<string, ConfigValue>;
  const next: Record<string, ConfigValue> = { ...current };

  if ('origin_x' in current) {
    next.origin_x = nextScalar(current.origin_x, roundTo(event.origin.x, COORD_DECIMALS));
  }
  if ('origin_y' in current) {
    next.origin_y = nextScalar(current.origin_y, roundTo(event.origin.y, COORD_DECIMALS));
  }
  if ('origin_z' in current) {
    next.origin_z = nextScalar(current.origin_z, roundTo(event.origin.z, COORD_DECIMALS));
  }
  if ('rotation_x' in current) {
    next.rotation_x = nextScalar(
      current.rotation_x,
      roundTo(wrapDegrees(event.rotation.x), ANGLE_DECIMALS)
    );
  }
  if ('rotation_y' in current) {
    next.rotation_y = nextScalar(
      current.rotation_y,
      roundTo(wrapDegrees(event.rotation.y), ANGLE_DECIMALS)
    );
  }
  if ('rotation_z' in current) {
    next.rotation_z = nextScalar(
      current.rotation_z,
      roundTo(wrapDegrees(event.rotation.z), ANGLE_DECIMALS)
    );
  }

  const nextDictionary: Record<string, ConfigValue> = {
    ...(dictionary as Record<string, ConfigValue>),
    [event.id]: next,
  };

  return {
    ...config,
    [ELECTRODE_LOCATIONS_CONFIG_KEY]: nextDictionary,
  };
}
