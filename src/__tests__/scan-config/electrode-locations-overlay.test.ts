import chroma from 'chroma-js';
import { describe, expect, it } from 'vitest';

import {
  adaptColorToBackground,
  CANVAS_DARK,
  CANVAS_LIGHT,
} from '@/features/scan-config/components/color-by/contrast';
import {
  colorForElectrodeBlock,
  colorForElectrodeOrigin,
  ELECTRODE_PALETTE,
  electrodeDictionaryToPlaceholderOverlays,
  electrodeSummaryToOverlays,
  hasElectrodeLocationsDictionary,
  mergeElectrodeOverlays,
  resolveElectrodeScanSelection,
  resolveScanIndex,
  seedElectrodeInitialOrigin,
} from '@/features/scan-config/components/model-preview/electrode-locations-overlay';

describe('electrodeSummaryToOverlays', () => {
  it('maps locations to Float32Array overlay groups with stable colours', () => {
    const groups = electrodeSummaryToOverlays({
      probe_b: { locations: [[4, 5, 6]] },
      probe_a: {
        locations: [
          [1, 2, 3],
          [7, 8, 9],
        ],
      },
    });

    expect(groups.map((g) => g.name)).toEqual(['probe_a', 'probe_b']);
    expect(groups.map((g) => g.id)).toEqual(['probe_a', 'probe_b']);
    expect(groups[0].color).toBe(colorForElectrodeBlock('probe_a'));
    expect(groups[1].color).toBe(colorForElectrodeBlock('probe_b'));
    expect(Array.from(groups[0].coordinates)).toEqual([1, 2, 3, 7, 8, 9]);
    expect(Array.from(groups[1].coordinates)).toEqual([4, 5, 6]);
  });

  it('adds a distinct-colour origin sphere when origin_* is present', () => {
    const groups = electrodeSummaryToOverlays({
      utah: {
        locations: [
          [10, 20, 30],
          [11, 21, 31],
        ],
        origin_x: 9,
        origin_y: 90,
        origin_z: 10,
        rotation_x: 15,
        rotation_z: 30,
      },
    });

    expect(groups).toHaveLength(2);
    const electrodes = groups.find((g) => g.kind === 'electrodes');
    const origin = groups.find((g) => g.kind === 'origin');
    expect(electrodes?.name).toBe('utah');
    expect(electrodes?.id).toBe('utah');
    expect(origin?.name).toBe('utah (origin)');
    expect(origin?.id).toBe('utah');
    expect(electrodes?.color).toBe(colorForElectrodeBlock('utah'));
    expect(origin?.color).toBe(colorForElectrodeOrigin('utah'));
    expect(origin?.color).not.toBe(electrodes?.color);
    expect(origin?.coordinates).toBeDefined();
    expect(Array.from(origin?.coordinates ?? [])).toEqual([9, 90, 10]);
    expect(electrodes?.origin).toEqual([9, 90, 10]);
    expect(electrodes?.rotation).toEqual({ x: 15, y: 0, z: 30 });
    expect(origin?.rotation).toEqual({ x: 15, y: 0, z: 30 });
  });

  it('skips origin when origin_* is incomplete', () => {
    const groups = electrodeSummaryToOverlays({
      linear: {
        locations: [[1, 2, 3]],
        origin_x: 50,
        origin_y: 40,
        // origin_z missing
      },
    });
    expect(groups).toHaveLength(1);
    expect(groups[0].kind).toBe('electrodes');
  });

  it('skips empty or missing locations', () => {
    expect(
      electrodeSummaryToOverlays({
        empty: { locations: [] },
        missing: {} as { locations: [number, number, number][] },
      })
    ).toEqual([]);
  });

  it('returns [] for nullish summary', () => {
    expect(electrodeSummaryToOverlays(null)).toEqual([]);
    expect(electrodeSummaryToOverlays(undefined)).toEqual([]);
  });
});

describe('colorForElectrodeBlock', () => {
  it('is stable for the same block name', () => {
    expect(colorForElectrodeBlock('linear_1')).toBe(colorForElectrodeBlock('linear_1'));
  });
});

describe('hasElectrodeLocationsDictionary', () => {
  it('accepts non-empty objects only', () => {
    expect(hasElectrodeLocationsDictionary({ a: {} })).toBe(true);
    expect(hasElectrodeLocationsDictionary({})).toBe(false);
    expect(hasElectrodeLocationsDictionary(null)).toBe(false);
    expect(hasElectrodeLocationsDictionary([])).toBe(false);
  });
});

describe('seedElectrodeInitialOrigin', () => {
  it('overwrites origin_* with the circuit anchor', () => {
    expect(
      seedElectrodeInitialOrigin(
        { type: 'LinearExtracellularLocations', origin_x: 0, origin_y: 0, origin_z: 0 },
        [100.1234, 200.5678, -50.999]
      )
    ).toEqual({
      type: 'LinearExtracellularLocations',
      origin_x: 100.123,
      origin_y: 200.568,
      origin_z: -50.999,
    });
  });

  it('is a no-op without an anchor or origin fields', () => {
    const initial = { type: 'LinearExtracellularLocations', origin_x: 0, origin_y: 0, origin_z: 0 };
    expect(seedElectrodeInitialOrigin(initial, null)).toBe(initial);
    expect(seedElectrodeInitialOrigin({ type: 'Other' }, [1, 2, 3])).toEqual({ type: 'Other' });
  });
});

describe('electrodeDictionaryToPlaceholderOverlays', () => {
  it('builds a stub probe and origin from config origin_*', () => {
    const groups = electrodeDictionaryToPlaceholderOverlays({
      probe: {
        type: 'LinearExtracellularLocations',
        origin_x: 10,
        origin_y: 20,
        origin_z: 30,
        n_electrodes: 3,
        spacing: 50,
      },
    });
    expect(groups).toHaveLength(2);
    const electrodes = groups.find((g) => g.kind === 'electrodes');
    const origin = groups.find((g) => g.kind === 'origin');
    expect(Array.from(electrodes?.coordinates ?? [])).toEqual([
      10, 20, 30, 10, 70, 30, 10, 120, 30,
    ]);
    expect(Array.from(origin?.coordinates ?? [])).toEqual([10, 20, 30]);
    expect(electrodes?.id).toBe('probe');
  });

  it('applies rotation_x/z to the stub so placeholders keep orientation', () => {
    const groups = electrodeDictionaryToPlaceholderOverlays({
      probe: {
        origin_x: 0,
        origin_y: 0,
        origin_z: 0,
        n_electrodes: 2,
        spacing: 100,
        rotation_x: 90,
        rotation_z: 0,
      },
    });
    const electrodes = groups.find((g) => g.kind === 'electrodes');
    const coords = Array.from(electrodes?.coordinates ?? []);
    // Local +Y after Rx=90° → world +Z (Obi-One ZXY: Rz*Rx*Ry).
    expect(coords[0]).toBeCloseTo(0, 5);
    expect(coords[1]).toBeCloseTo(0, 5);
    expect(coords[2]).toBeCloseTo(0, 5);
    expect(coords[3]).toBeCloseTo(0, 5);
    expect(coords[4]).toBeCloseTo(0, 5);
    expect(coords[5]).toBeCloseTo(100, 5);
    expect(electrodes?.rotation).toEqual({ x: 90, y: 0, z: 0 });
  });
});

describe('mergeElectrodeOverlays', () => {
  it('keeps placeholders only for ids missing from the API summary', () => {
    const placeholders = electrodeDictionaryToPlaceholderOverlays({
      a: { origin_x: 1, origin_y: 2, origin_z: 3, n_electrodes: 1 },
      b: { origin_x: 4, origin_y: 5, origin_z: 6, n_electrodes: 1 },
    });
    const fromApi = electrodeSummaryToOverlays({
      a: { locations: [[9, 9, 9]], origin_x: 9, origin_y: 9, origin_z: 9 },
    });
    const merged = mergeElectrodeOverlays(placeholders, fromApi);
    const ids = [...new Set(merged.map((g) => g.id))];
    expect(ids.sort()).toEqual(['a', 'b']);
    const aElectrodes = merged.find((g) => g.id === 'a' && g.kind === 'electrodes');
    expect(Array.from(aElectrodes?.coordinates ?? [])).toEqual([9, 9, 9]);
  });
});

describe('electrode colour assignment', () => {
  it('maps the creation ordinal in the block name to a palette slot', () => {
    expect(colorForElectrodeBlock('Electrode 0')).toBe(ELECTRODE_PALETTE[0]);
    expect(colorForElectrodeBlock('Electrode 1')).toBe(ELECTRODE_PALETTE[1]);
    expect(colorForElectrodeBlock('Electrode 2')).toBe(ELECTRODE_PALETTE[2]);
  });

  it('keeps existing colours when a block is added or removed', () => {
    const before = ['Electrode 0', 'Electrode 1'].map(colorForElectrodeBlock);
    colorForElectrodeBlock('Electrode 2');
    expect(['Electrode 0', 'Electrode 1'].map(colorForElectrodeBlock)).toEqual(before);
    // deleting "Electrode 0" must not renumber the survivors
    expect(colorForElectrodeBlock('Electrode 1')).toBe(before[1]);
  });

  it('is pure — same name, same colour, no call-order dependency', () => {
    expect(colorForElectrodeBlock('Electrode 3')).toBe(colorForElectrodeBlock('Electrode 3'));
    expect(colorForElectrodeBlock('Electrode 3')).toBe(ELECTRODE_PALETTE[3]);
  });

  it('wraps past the end of the palette', () => {
    expect(colorForElectrodeBlock(`Electrode ${ELECTRODE_PALETTE.length}`)).toBe(
      ELECTRODE_PALETTE[0]
    );
  });

  it('falls back to a stable hash for names with no ordinal', () => {
    const first = colorForElectrodeBlock('renamed probe');
    expect(ELECTRODE_PALETTE).toContain(first);
    expect(colorForElectrodeBlock('renamed probe')).toBe(first);
  });

  it('gives the origin marker a visible variant of the block colour', () => {
    for (const name of ['blue-block', 'black-block', 'orange-block']) {
      const block = colorForElectrodeBlock(name);
      const origin = colorForElectrodeOrigin(name);
      expect(origin).not.toBe(block);
      // never collapses to pure black, which would vanish against dark markers
      expect(origin.toLowerCase()).not.toBe('#000000');
    }
  });
});

describe('resolveScanIndex', () => {
  it('defaults to the first value when nothing is selected', () => {
    expect(resolveScanIndex(undefined, 'probe', 'origin_x', 3)).toBe(0);
    expect(resolveScanIndex({}, 'probe', 'origin_x', 3)).toBe(0);
  });

  it('returns the selected index when it is still in range', () => {
    expect(resolveScanIndex({ probe: { origin_x: 2 } }, 'probe', 'origin_x', 3)).toBe(2);
  });

  it('falls back to the first value when the selection went stale', () => {
    expect(resolveScanIndex({ probe: { origin_x: 5 } }, 'probe', 'origin_x', 2)).toBe(0);
    expect(resolveScanIndex({ probe: { origin_x: -1 } }, 'probe', 'origin_x', 2)).toBe(0);
  });
});

describe('resolveElectrodeScanSelection', () => {
  it('collapses each sweep to its active value', () => {
    const resolved = resolveElectrodeScanSelection(
      { probe: { origin_x: [4100.223, 1100], origin_y: [0, 50], n_electrodes: 8 } },
      { probe: { origin_x: 1 } }
    );
    expect(resolved).toEqual({ probe: { origin_x: 1100, origin_y: 0, n_electrodes: 8 } });
  });

  it('leaves blocks without sweeps untouched', () => {
    const dictionary = { probe: { origin_x: 10, type: 'Linear' } };
    expect(resolveElectrodeScanSelection(dictionary, {})).toEqual(dictionary);
  });

  it('ignores selections belonging to another block', () => {
    const resolved = resolveElectrodeScanSelection(
      { probe_a: { origin_x: [1, 2] }, probe_b: { origin_x: [7, 8] } },
      { probe_b: { origin_x: 1 } }
    );
    expect(resolved).toEqual({ probe_a: { origin_x: 1 }, probe_b: { origin_x: 8 } });
  });

  it('passes non-dictionary input straight through', () => {
    expect(resolveElectrodeScanSelection(null, {})).toBeNull();
    expect(resolveElectrodeScanSelection([1, 2], {})).toEqual([1, 2]);
  });
});

describe('electrode palette legibility', () => {
  const CANVASES = [CANVAS_LIGHT, CANVAS_DARK];

  it('clears the viewer contrast floor on both canvases once adapted', () => {
    for (const background of CANVASES) {
      for (const color of ELECTRODE_PALETTE) {
        const adapted = adaptColorToBackground(color, background);
        expect(chroma.contrast(adapted, background)).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('keeps every pair of adapted colours visually distinct', () => {
    for (const background of CANVASES) {
      const adapted = ELECTRODE_PALETTE.map((c) => adaptColorToBackground(c, background));
      for (let i = 0; i < adapted.length; i++) {
        for (let j = i + 1; j < adapted.length; j++) {
          // deltaE > 10 reads as a different colour rather than a shade
          expect(chroma.deltaE(adapted[i], adapted[j])).toBeGreaterThan(10);
        }
      }
    }
  });
});
