import { describe, expect, it } from 'vitest';

import { applyElectrodeOverlayTransform } from '@/features/scan-config/components/model-preview/apply-electrode-overlay-transform';

import type { Config } from '@/features/scan-config/types';

describe('applyElectrodeOverlayTransform', () => {
  it('updates scalar origin and rotation fields for a named block', () => {
    const config = {
      electrode_locations: {
        Lin: {
          type: 'LinearExtracellularLocations',
          origin_x: 0,
          origin_y: 0,
          origin_z: 0,
          rotation_x: 0,
          rotation_z: 0,
          n_electrodes: 16,
          spacing: 20,
        },
      },
    } as unknown as Config;

    const next = applyElectrodeOverlayTransform(config, {
      id: 'Lin',
      origin: { x: 12.3456, y: -4.2, z: 100.999 },
      rotation: { x: 15.126, y: 0, z: 359.5 },
      phase: 'end',
    });

    expect(next.electrode_locations).toMatchObject({
      Lin: {
        origin_x: 12.346,
        origin_y: -4.2,
        origin_z: 100.999,
        rotation_x: 15.13,
        rotation_z: 359.5,
        n_electrodes: 16,
        spacing: 20,
      },
    });
  });

  it('leaves parameter-sweep arrays untouched', () => {
    const config = {
      electrode_locations: {
        Lin: {
          origin_x: [0, 10],
          origin_y: 0,
          origin_z: 0,
          rotation_x: 0,
          rotation_z: 0,
        },
      },
    } as unknown as Config;

    const next = applyElectrodeOverlayTransform(config, {
      id: 'Lin',
      origin: { x: 5, y: 6, z: 7 },
      rotation: { x: 1, y: 0, z: 2 },
      phase: 'end',
    });

    const block = (next.electrode_locations as Record<string, Record<string, unknown>>).Lin;
    expect(block.origin_x).toEqual([0, 10]);
    expect(block.origin_y).toBe(6);
    expect(block.origin_z).toBe(7);
  });

  it('is a no-op for unknown block ids', () => {
    const config = {
      electrode_locations: {
        Lin: { origin_x: 1, origin_y: 2, origin_z: 3 },
      },
    } as unknown as Config;

    expect(
      applyElectrodeOverlayTransform(config, {
        id: 'missing',
        origin: { x: 9, y: 9, z: 9 },
        rotation: { x: 0, y: 0, z: 0 },
        phase: 'end',
      })
    ).toBe(config);
  });
});
