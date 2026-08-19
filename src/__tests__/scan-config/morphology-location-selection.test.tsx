import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildMorphoTree,
  buildSonataSectionIdIndex,
} from '@/features/scan-config/components/circuit-viz/build-morpho-tree';
import {
  morphologyLocationsColor,
  recedeMarkerColor,
} from '@/features/scan-config/components/color-by/palette';
import { useMorphologyLocationSelection } from '@/features/scan-config/components/hooks/use-morphology-location-selection';
import {
  collectLocations,
  MorphologyLocationPickModeDict,
  readEntry,
  readLocations,
  supportsMorphologyLocationPicking,
} from '@/features/scan-config/components/model-preview/morphology-locations-block';
import { MorphoViewerTreeItemType } from '@/features/scan-config/types';

import type { Config, Sections } from '@/features/scan-config/types';
import type {
  MorphoViewerMorphologyLocationHover,
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

/** Two explicit blocks, one row each. */
const TWO_BLOCKS = {
  first: { type: 'ExplicitMorphologyLocations', locations: [{ section_id: 3, offset: 0.1 }] },
  second: { type: 'ExplicitMorphologyLocations', locations: [{ section_id: 1, offset: 0.2 }] },
};

/** A workflow that supports morphology locations, with none created yet. */
const EMPTY: Config = { morphology_locations: {} } as unknown as Config;

/** Elsewhere in the form, so a pick creates a block rather than extending one. */
const elsewhere = { selectedRootElement: 'recordings', selectedEntry: 'some recording' };

function configWith(locations: { section_id: number; offset: number }[]): Config {
  return {
    morphology_locations: {
      block: { type: 'ExplicitMorphologyLocations', locations },
    },
  };
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

const BACKGROUND = '#000000';
const SECTION_INDEX = new Map([[CELL_ID, buildSonataSectionIdIndex(SECTIONS)]]);

type TOptions = Parameters<typeof useMorphologyLocationSelection>[0];

/** Editing `block` of `configWith(...)`, unless the test says otherwise. */
function render(overrides: Partial<TOptions>) {
  return renderHook(() =>
    useMorphologyLocationSelection({
      selectedRootElement: 'morphology_locations',
      selectedEntry: 'block',
      cells: CELLS,
      sonataSectionIds: SECTION_INDEX,
      backgroundColor: BACKGROUND,
      ...overrides,
    })
  );
}

/** A pick on the basal dendrite, which is the one type locations may sit on. */
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
    const { result } = render({ config: configWith([{ section_id: 3, offset: 0.5 }]) });

    expect(result.current.selection?.selected).toEqual([
      expect.objectContaining({ cellId: CELL_ID, sectionName: '0', offset: 0.5 }),
    ]);
  });

  it('keeps the open block bright and mutes the others', () => {
    const { result } = render({
      config: { morphology_locations: TWO_BLOCKS } as unknown as Config,
      selectedEntry: 'first',
    });
    const colors = (result.current.selection?.selected ?? []).map((marker) => marker.color);

    expect(colors).toContain(morphologyLocationsColor('first'));
    expect(colors).toContain(recedeMarkerColor(morphologyLocationsColor('second'), BACKGROUND));
  });

  it('draws nothing for a section the index does not know', () => {
    const { result } = render({
      config: configWith([{ section_id: 7, offset: 0.5 }]),
      sonataSectionIds: new Map([[CELL_ID, new Map()]]),
      onConfigChange: vi.fn(),
    });

    expect(result.current.selection?.selected).toEqual([]);
  });
});

describe('useMorphologyLocationSelection picking', () => {
  it('removes only the row that was clicked when two hold the same values', () => {
    const rows = [
      { section_id: 3, offset: 0.5 },
      { section_id: 3, offset: 0.5 },
    ];
    const config = configWith(rows);
    let next: Config | undefined;

    const { result } = render({
      config,
      onConfigChange: (updater) => {
        next = updater(config);
      },
    });
    const markers = result.current.selection?.selected ?? [];

    act(() => {
      result.current.selection?.onPick?.(pick({ existingMarker: markers[1] }));
    });

    expect(next).toBeDefined();
    expect(readLocations(readEntry(next, 'block'))).toHaveLength(1);
  });

  it('explains the backend minimum instead of silently doing nothing', () => {
    infos.length = 0;
    const onConfigChange = vi.fn();

    const { result } = render({
      config: configWith([{ section_id: 3, offset: 0.5 }]),
      onConfigChange,
    });
    const markers = result.current.selection?.selected ?? [];

    act(() => {
      result.current.selection?.onPick?.(pick({ existingMarker: markers[0] }));
    });

    expect(onConfigChange).not.toHaveBeenCalled();
    expect(infos.join(' ')).toMatch(/at least one location/i);
  });

  it('explains a click it cannot store rather than ignoring it', () => {
    infos.length = 0;
    const onConfigChange = vi.fn();

    const { result } = render({
      config: configWith([{ section_id: 3, offset: 0.5 }]),
      onConfigChange,
    });

    act(() => {
      result.current.selection?.onPick?.(pick({ sonataSectionId: undefined }));
    });

    expect(onConfigChange).not.toHaveBeenCalled();
    expect(infos.join(' ')).toMatch(/section ids/i);
  });
});

describe('useMorphologyLocationSelection with no block open', () => {
  it('hands the host a block to add, rather than naming one itself', () => {
    const onCreateEntry = vi.fn();

    const { result } = render({ ...elsewhere, config: EMPTY, onCreateEntry });

    expect(result.current.pickMode).toBe(MorphologyLocationPickModeDict.Create);
    act(() => {
      result.current.selection?.onPick?.(pick());
    });

    expect(onCreateEntry).toHaveBeenCalledWith('morphology_locations', {
      type: 'ExplicitMorphologyLocations',
      locations: [{ section_id: 3, offset: 0.25 }],
    });
  });

  it('refuses a marker belonging to a block that is not open', () => {
    infos.length = 0;
    const onConfigChange = vi.fn();
    const onCreateEntry = vi.fn();

    const { result } = render({
      ...elsewhere,
      config: { morphology_locations: TWO_BLOCKS } as unknown as Config,
      onConfigChange,
      onCreateEntry,
    });
    const markers = result.current.selection?.selected ?? [];

    act(() => {
      result.current.selection?.onPick?.(pick({ offset: 0.1, existingMarker: markers[0] }));
    });

    expect(onConfigChange).not.toHaveBeenCalled();
    expect(onCreateEntry).not.toHaveBeenCalled();
    expect(infos.join(' ')).toMatch(/belongs to "first"/);
  });

  it('does not offer picking when the form cannot open the block it would create', () => {
    const { result } = render({ ...elsewhere, config: EMPTY });

    expect(result.current.pickMode).toBe(null);
    expect(result.current.selection).toBeUndefined();
  });

  it('does not offer picking where the workflow has no morphology locations', () => {
    const { result } = render({ ...elsewhere, config: {} as Config, onCreateEntry: vi.fn() });

    expect(result.current.pickMode).toBe(null);
  });
});

describe('useMorphologyLocationSelection hover', () => {
  const PREVIEW: MorphoViewerMorphologyLocationHover = {
    kind: 'preview',
    cellId: CELL_ID,
    sectionName: '0',
    sonataSectionId: 3,
    sectionType: MorphoViewerTreeItemType.BasalDendrite,
    offset: 0.25,
    screen: { x: 0.5, y: 0.5 },
  };

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('waits for the pointer to rest before offering a new block', () => {
    const { result } = render({ ...elsewhere, config: EMPTY, onCreateEntry: vi.fn() });

    act(() => result.current.selection?.onHover?.(PREVIEW));
    expect(result.current.hover).toBe(null);

    act(() => vi.advanceTimersByTime(299));
    expect(result.current.hover).toBe(null);

    act(() => vi.advanceTimersByTime(1));
    expect(result.current.hover).toBe(PREVIEW);
  });

  it('follows the pointer once it is up, and hides as soon as it leaves', () => {
    const moved = { ...PREVIEW, offset: 0.4 };
    const { result } = render({ ...elsewhere, config: EMPTY, onCreateEntry: vi.fn() });

    act(() => result.current.selection?.onHover?.(PREVIEW));
    act(() => vi.advanceTimersByTime(300));

    // Already up: no second wait.
    act(() => result.current.selection?.onHover?.(moved));
    expect(result.current.hover).toBe(moved);

    act(() => result.current.selection?.onHover?.(null));
    expect(result.current.hover).toBe(null);

    // Left the neurite, so coming back waits again.
    act(() => result.current.selection?.onHover?.(PREVIEW));
    expect(result.current.hover).toBe(null);
    act(() => vi.advanceTimersByTime(300));
    expect(result.current.hover).toBe(PREVIEW);
  });

  it('does not wait while a block is open', () => {
    const { result } = render({
      config: configWith([{ section_id: 3, offset: 0.5 }]),
      onConfigChange: vi.fn(),
    });

    act(() => result.current.selection?.onHover?.(PREVIEW));
    expect(result.current.hover).toBe(PREVIEW);
  });
});

describe('collectLocations', () => {
  it('gathers the rows of every explicit block', () => {
    expect(collectLocations(TWO_BLOCKS).map((row) => row.section_id)).toEqual([3, 1]);
  });

  it('ignores blocks that only describe how to sample', () => {
    const dictionary = {
      explicit: {
        type: 'ExplicitMorphologyLocations',
        locations: [{ section_id: 3, offset: 0.1 }],
      },
      sampled: { type: 'RandomMorphologyLocations', number_of_locations: 20 },
    };

    expect(collectLocations(dictionary)).toHaveLength(1);
  });

  it('is empty when there is no morphology-locations dictionary at all', () => {
    expect(collectLocations(null)).toEqual([]);
  });
});

describe('morphologyLocationsColor', () => {
  it('does not depend on where the block sits in the dictionary', () => {
    const before = collectLocations(TWO_BLOCKS);
    const after = collectLocations({ second: TWO_BLOCKS.second });

    expect(morphologyLocationsColor(after[0].entry)).toBe(
      morphologyLocationsColor(before[1].entry)
    );
  });

  it('gives different blocks different colours', () => {
    expect(morphologyLocationsColor('block-a')).not.toBe(morphologyLocationsColor('block-b'));
  });
});
