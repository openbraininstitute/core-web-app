import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  buildMorphoTree,
  buildSonataSectionIdIndex,
} from '@/features/scan-config/components/circuit-viz/build-morpho-tree';
import {
  readAllLocations,
  readEntry,
  readLocations,
  supportsMorphologyLocationPicking,
} from '@/features/scan-config/components/model-preview/morphology-locations-block';
import { useMorphologyLocationSelection } from '@/features/scan-config/components/model-preview/use-morphology-location-selection';
import { MorphoViewerTreeItemType } from '@/features/scan-config/types';

import type { Config, Sections } from '@/features/scan-config/types';
import type {
  MorphoViewerMorphologyLocationPick,
  MorphoViewerSmallCircuitCell,
} from '@/morpho-viewer';

// The viewer barrel pulls in tgd, which touches `document` at module scope.
vi.mock('@/morpho-viewer', async () => ({
  MorphoViewerTreeItemType: (await import('@/features/scan-config/types')).MorphoViewerTreeItemType,
}));

const infos: string[] = [];
vi.mock('@/components/notification', () => ({
  useAppMessage: () => ({
    info: (text: string) => infos.push(text),
  }),
}));

const CELL_ID = 'circuit#0?axons=false';
const CELLS: MorphoViewerSmallCircuitCell[] = [
  { id: CELL_ID, center: [0, 0, 0], orientation: [0, 0, 0, 1], somaRadius: 8 },
];

function configWith(locations: { section_id: number; offset: number }[]): Config {
  return {
    morphology_locations: {
      block: { type: 'ExplicitMorphologyLocations', locations },
    },
  };
}

function renderSelection(
  config: Config,
  sonataSectionIds?: Map<string, Map<number, string>>,
  onConfigChange?: (updater: (previous: Config) => Config) => void
) {
  return renderHook(() =>
    useMorphologyLocationSelection({
      config,
      onConfigChange,
      selectedRootElement: 'morphology_locations',
      selectedEntry: 'block',
      cells: CELLS,
      sonataSectionIds,
    })
  );
}

/** Two sections whose morphio ids and SONATA ids are not one apart. */
const SECTIONS: Sections = [
  {
    id: 'soma',
    sonata_section_id: 0,
    parent_id: null,
    type: MorphoViewerTreeItemType.Soma,
    points: [[0, 0, 0]],
    radii: [8],
  },
  {
    id: '0',
    sonata_section_id: 3,
    parent_id: 'soma',
    type: MorphoViewerTreeItemType.BasalDendrite,
    points: [
      [8, 0, 0],
      [58, 0, 0],
    ],
    radii: [1, 1],
  },
  {
    id: '1',
    sonata_section_id: 1,
    parent_id: 'soma',
    type: MorphoViewerTreeItemType.Axon,
    points: [
      [0, 8, 0],
      [0, 58, 0],
    ],
    radii: [1, 1],
  },
];

describe('buildSonataSectionIdIndex', () => {
  it('pairs each SONATA id with the section name the viewer draws', () => {
    const index = buildSonataSectionIdIndex(SECTIONS);

    expect(index.get(3)).toBe('0');
    expect(index.get(1)).toBe('1');
    expect(index.get(0)).toBe('soma');
  });

  it('leaves out sections an older deployment reports no SONATA id for', () => {
    const index = buildSonataSectionIdIndex([{ ...SECTIONS[1], sonata_section_id: undefined }]);

    expect(index.size).toBe(0);
  });

  it('indexes the same sections the tree is built from', () => {
    const tree = buildMorphoTree(SECTIONS, CELL_ID);

    expect(tree.data.cellId).toBe(CELL_ID);
    expect(buildSonataSectionIdIndex(SECTIONS).get(3)).toBe('0');
  });
});

describe('supportsMorphologyLocationPicking', () => {
  it('is false for a sampling block under the same root element', () => {
    const sampling: Config = {
      morphology_locations: { block: { type: 'RandomMorphologyLocations' } },
    };

    expect(
      supportsMorphologyLocationPicking({
        config: sampling,
        selectedRootElement: 'morphology_locations',
        selectedEntry: 'block',
      })
    ).toBe(false);
  });

  it('is true only for an explicit block', () => {
    expect(
      supportsMorphologyLocationPicking({
        config: configWith([{ section_id: 3, offset: 0.5 }]),
        selectedRootElement: 'morphology_locations',
        selectedEntry: 'block',
      })
    ).toBe(true);
  });
});

describe('useMorphologyLocationSelection markers', () => {
  it('addresses the section by the pairing the response carried, not by an offset id', () => {
    const index = new Map([[CELL_ID, buildSonataSectionIdIndex(SECTIONS)]]);

    const { result } = renderSelection(configWith([{ section_id: 3, offset: 0.5 }]), index);

    expect(result.current.selection?.selected).toEqual([
      expect.objectContaining({ cellId: CELL_ID, sectionName: '0', offset: 0.5 }),
    ]);
  });

  it('draws nothing for a section the index does not know', () => {
    const index = new Map([[CELL_ID, new Map<number, string>()]]);

    const { result } = renderSelection(configWith([{ section_id: 7, offset: 0.5 }]), index);

    expect(result.current.selection?.selected).toEqual([]);
  });
});

describe('useMorphologyLocationSelection picking', () => {
  function pick(overrides: Partial<MorphoViewerMorphologyLocationPick> = {}) {
    return {
      cell: CELLS[0],
      sectionName: '0',
      sonataSectionId: 3,
      sectionType: MorphoViewerTreeItemType.BasalDendrite,
      offset: 0.25,
      ...overrides,
    } as MorphoViewerMorphologyLocationPick;
  }

  it('removes only the row that was clicked when two hold the same values', () => {
    const rows = [
      { section_id: 3, offset: 0.5 },
      { section_id: 3, offset: 0.5 },
    ];
    const config = configWith(rows);
    const index = new Map([[CELL_ID, buildSonataSectionIdIndex(SECTIONS)]]);
    let next: Config | undefined;

    const { result } = renderSelection(config, index, (updater) => {
      next = updater(config);
    });
    const markers = result.current.selection?.selected ?? [];

    act(() => {
      result.current.selection?.onPick(pick({ existingMarker: markers[1] }));
    });

    expect(next).toBeDefined();
    expect(readLocations(readEntry(next, 'block'))).toHaveLength(1);
  });

  it('explains the backend minimum instead of silently doing nothing', () => {
    infos.length = 0;
    const config = configWith([{ section_id: 3, offset: 0.5 }]);
    const index = new Map([[CELL_ID, buildSonataSectionIdIndex(SECTIONS)]]);
    const onConfigChange = vi.fn();

    const { result } = renderSelection(config, index, onConfigChange);
    const markers = result.current.selection?.selected ?? [];

    act(() => {
      result.current.selection?.onPick(pick({ existingMarker: markers[0] }));
    });

    expect(onConfigChange).not.toHaveBeenCalled();
    expect(infos.join(' ')).toMatch(/at least one location/i);
  });

  it('explains a click it cannot store rather than ignoring it', () => {
    infos.length = 0;
    const config = configWith([{ section_id: 3, offset: 0.5 }]);
    const onConfigChange = vi.fn();

    const { result } = renderSelection(config, undefined, onConfigChange);

    act(() => {
      result.current.selection?.onPick(pick({ sonataSectionId: undefined }));
    });

    expect(onConfigChange).not.toHaveBeenCalled();
    expect(infos.join(' ')).toMatch(/section ids/i);
  });
});

describe('readAllLocations', () => {
  it('gathers the rows of every explicit block', () => {
    const config = {
      morphology_locations: {
        first: { type: 'ExplicitMorphologyLocations', locations: [{ section_id: 3, offset: 0.1 }] },
        second: {
          type: 'ExplicitMorphologyLocations',
          locations: [
            { section_id: 5, offset: 0.2 },
            { section_id: 7, offset: 0.3 },
          ],
        },
      },
    } as unknown as Config;

    expect(readAllLocations(config).map((row) => row.section_id)).toEqual([3, 5, 7]);
  });

  it('ignores blocks that only describe how to sample', () => {
    const config = {
      morphology_locations: {
        explicit: {
          type: 'ExplicitMorphologyLocations',
          locations: [{ section_id: 3, offset: 0.1 }],
        },
        sampled: { type: 'RandomMorphologyLocations', number_of_locations: 20 },
      },
    } as unknown as Config;

    expect(readAllLocations(config)).toHaveLength(1);
  });

  it('is empty when there is no morphology-locations dictionary at all', () => {
    expect(readAllLocations({} as Config)).toEqual([]);
    expect(readAllLocations(null)).toEqual([]);
  });
});
