import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useLocationSelection } from '@/features/circuit-viewer/morphologies/use-location-selection';
import { SectionType } from '@/features/circuit-viewer/section-type';
import {
  morphologyLocationsColor,
  recedeMarkerColor,
} from '@/features/scan-config/components/color-by/palette';
import {
  MorphologyLocationPickModeDict,
  readEntry,
  readLocations,
} from '@/features/scan-config/components/model-preview/morphology-locations-block';

import type { LocationHit } from '@/features/circuit-viewer/morphologies/pointer';
import type { SectionSpot } from '@/features/circuit-viewer/morphologies/types';
import type { Config } from '@/features/scan-config/types';

const infos: string[] = [];
vi.mock('@/components/notification', () => ({
  useAppMessage: () => ({
    info: (text: string) => infos.push(text),
  }),
}));

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

const BACKGROUND = '#000000';
const CELLS = [4];

type TOptions = Parameters<typeof useLocationSelection>[0];

/** Editing `block` of `configWith(...)`, unless the test says otherwise. */
function render(overrides: Partial<TOptions>) {
  return renderHook(() =>
    useLocationSelection({
      selectedRootElement: 'morphology_locations',
      selectedEntry: 'block',
      cells: CELLS,
      backgroundColor: BACKGROUND,
      // A single neuron or a synaptome, which is where explicit locations are taken.
      supportsExplicitLocations: true,
      ...overrides,
    })
  );
}

/** A point of a basal dendrite, which is the one type locations may sit on. */
function spot(overrides: Partial<SectionSpot> = {}): LocationHit {
  return {
    spot: {
      cell: 4,
      sonataId: 3,
      type: SectionType.BasalDendrite,
      offset: 0.123456,
      screen: { x: 0.5, y: 0.5 },
      ...overrides,
    },
  };
}

/** The marker of `index`, as the view tells of it. */
const marker = (index: number): LocationHit => ({
  marker: index,
  type: SectionType.BasalDendrite,
  screen: { x: 0.25, y: 0.75 },
  visible: true,
});

describe('the location markers', () => {
  it('mark every stored location on each cell given, by its section’s SONATA number', () => {
    const { result } = render({
      config: configWith([{ section_id: 3, offset: 0.5 }]),
      cells: [4, 9],
    });

    expect(result.current.locations?.markers).toEqual([
      expect.objectContaining({ cell: 4, sonataId: 3, offset: 0.5 }),
      expect.objectContaining({ cell: 9, sonataId: 3, offset: 0.5 }),
    ]);
    expect(result.current.locations?.radius).toBe(3);
  });

  it('keep the open block bright and mute the others', () => {
    const { result } = render({
      config: { morphology_locations: TWO_BLOCKS } as unknown as Config,
      selectedEntry: 'first',
    });
    const colors = (result.current.locations?.markers ?? []).map((m) => m.color);

    expect(colors).toEqual([
      morphologyLocationsColor('first'),
      recedeMarkerColor(morphologyLocationsColor('second'), BACKGROUND),
    ]);
  });

  it('are none on a population with no morphology, and none drawn read-only', () => {
    const config = configWith([{ section_id: 3, offset: 0.5 }]);
    const editing = render({ config, cells: [], onConfigChange: vi.fn() });
    expect(editing.result.current.locations?.markers).toEqual([]);
    expect(render({ config, cells: [] }).result.current.locations).toBeUndefined();
  });
});

describe('a location picked', () => {
  it('is added to the open block, its offset to four places', () => {
    const config = configWith([{ section_id: 3, offset: 0.5 }]);
    let next: Config | undefined;
    const { result } = render({
      config,
      onConfigChange: (updater) => {
        next = updater(config);
      },
    });

    act(() => result.current.locations?.onPick?.(spot()));

    expect(readLocations(readEntry(next, 'block'))).toEqual([
      { section_id: 3, offset: 0.5 },
      { section_id: 3, offset: 0.1235 },
    ]);
  });

  it('removes only the row whose marker was clicked when two hold the same values', () => {
    const config = configWith([
      { section_id: 3, offset: 0.5 },
      { section_id: 3, offset: 0.5 },
    ]);
    let next: Config | undefined;
    const { result } = render({
      config,
      onConfigChange: (updater) => {
        next = updater(config);
      },
    });

    act(() => result.current.locations?.onPick?.(marker(1)));

    expect(readLocations(readEntry(next, 'block'))).toHaveLength(1);
  });

  it('explains the backend minimum instead of silently doing nothing', () => {
    infos.length = 0;
    const onConfigChange = vi.fn();
    const { result } = render({
      config: configWith([{ section_id: 3, offset: 0.5 }]),
      onConfigChange,
    });

    act(() => result.current.locations?.onPick?.(marker(0)));

    expect(onConfigChange).not.toHaveBeenCalled();
    expect(infos.join(' ')).toMatch(/at least one location/i);
  });

  // The view picks on whatever cell the tap landed near, and a circuit scene holds every population's cells.
  it.each([
    ['a cell the block has nothing to do with', { cell: 7 }, /another population/i],
    ['a section with no SONATA number', { sonataId: null }, /section ids/i],
    ['an axon', { type: SectionType.Axon }, /Axon is not supported yet/],
    ['the soma', { type: SectionType.Soma, sonataId: 0 }, /Soma is not supported yet/],
  ] as const)('is refused, and said why, on %s', (_, overrides, why) => {
    infos.length = 0;
    const onConfigChange = vi.fn();
    const { result } = render({
      config: configWith([{ section_id: 3, offset: 0.5 }]),
      onConfigChange,
    });

    act(() => result.current.locations?.onPick?.(spot(overrides)));

    expect(onConfigChange).not.toHaveBeenCalled();
    expect(infos.join(' ')).toMatch(why);
  });

  it('shows a hand over the sections a location may sit on', () => {
    const { result } = render({ config: configWith([{ section_id: 3, offset: 0.5 }]) });
    const pickable = result.current.locations?.pickable;
    const of = (type: SectionType) => pickable?.((spot({ type }) as { spot: SectionSpot }).spot);
    expect(
      [SectionType.BasalDendrite, SectionType.ApicalDendrite, SectionType.Dendrite].map(of)
    ).toEqual([true, true, true]);
    expect([SectionType.Axon, SectionType.Soma].map(of)).toEqual([false, false]);
  });
});

describe('the locations on a model that takes no explicit locations', () => {
  it('pick nothing, wherever the form is', () => {
    const onCreateEntry = vi.fn();
    const { result } = render({
      ...elsewhere,
      config: EMPTY,
      onCreateEntry,
      supportsExplicitLocations: false,
    });

    expect(result.current.pickMode).toBe(null);
    expect(result.current.locations).toBeUndefined();
  });

  it('are drawn, read-only, from an explicit block left in the config', () => {
    const { result } = render({
      config: configWith([{ section_id: 3, offset: 0.1 }]),
      onConfigChange: vi.fn(),
      supportsExplicitLocations: false,
    });

    expect(result.current.pickMode).toBe(null);
    expect(result.current.locations?.markers).toHaveLength(1);
    expect(result.current.locations?.onPick).toBeUndefined();
    expect(result.current.locations?.onHover).toBeUndefined();
  });
});

describe('the locations with no block open', () => {
  it('hand the host a block to add, rather than naming one itself', () => {
    const onCreateEntry = vi.fn();
    const { result } = render({ ...elsewhere, config: EMPTY, onCreateEntry });

    expect(result.current.pickMode).toBe(MorphologyLocationPickModeDict.Create);
    act(() => result.current.locations?.onPick?.(spot({ offset: 0.25 })));

    expect(onCreateEntry).toHaveBeenCalledWith('morphology_locations', {
      type: 'ExplicitMorphologyLocations',
      locations: [{ section_id: 3, offset: 0.25 }],
    });
  });

  it('refuse a marker belonging to a block that is not open', () => {
    infos.length = 0;
    const onConfigChange = vi.fn();
    const onCreateEntry = vi.fn();
    const { result } = render({
      ...elsewhere,
      config: { morphology_locations: TWO_BLOCKS } as unknown as Config,
      onConfigChange,
      onCreateEntry,
    });

    act(() => result.current.locations?.onPick?.(marker(0)));

    expect(onConfigChange).not.toHaveBeenCalled();
    expect(onCreateEntry).not.toHaveBeenCalled();
    expect(infos.join(' ')).toMatch(/belongs to "first"/);
  });

  it('offer no picking when the form cannot open the block it would create', () => {
    const { result } = render({ ...elsewhere, config: EMPTY });

    expect(result.current.pickMode).toBe(null);
    expect(result.current.locations).toBeUndefined();
  });

  it('offer no picking where the workflow has no morphology locations', () => {
    const { result } = render({ ...elsewhere, config: {} as Config, onCreateEntry: vi.fn() });

    expect(result.current.pickMode).toBe(null);
  });
});

describe('the location under the pointer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const PREVIEW = {
    kind: 'preview',
    sectionType: SectionType.BasalDendrite,
    sonataSectionId: 3,
    offset: 0.123456,
    screen: { x: 0.5, y: 0.5 },
  };

  it('waits for the pointer to rest before offering a new block', () => {
    const { result } = render({ ...elsewhere, config: EMPTY, onCreateEntry: vi.fn() });

    act(() => result.current.locations?.onHover?.(spot()));
    expect(result.current.hover).toBe(null);
    act(() => vi.advanceTimersByTime(299));
    expect(result.current.hover).toBe(null);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.hover).toEqual(PREVIEW);
  });

  it('follows the pointer once it is up, and hides as soon as it leaves', () => {
    const { result } = render({ ...elsewhere, config: EMPTY, onCreateEntry: vi.fn() });

    act(() => result.current.locations?.onHover?.(spot()));
    act(() => vi.advanceTimersByTime(300));
    act(() => result.current.locations?.onHover?.(spot({ offset: 0.4 })));
    expect(result.current.hover).toEqual({ ...PREVIEW, offset: 0.4 });

    act(() => result.current.locations?.onHover?.(null));
    expect(result.current.hover).toBe(null);
    act(() => result.current.locations?.onHover?.(spot()));
    expect(result.current.hover).toBe(null);
  });

  it('does not wait while a block is open, and tells of a marker by its stored location', () => {
    const { result } = render({
      config: configWith([{ section_id: 3, offset: 0.5 }]),
      onConfigChange: vi.fn(),
    });

    act(() => result.current.locations?.onHover?.(marker(0)));
    expect(result.current.hover).toEqual({
      kind: 'selected',
      sectionType: SectionType.BasalDendrite,
      sonataSectionId: 3,
      offset: 0.5,
      screen: { x: 0.25, y: 0.75 },
    });
  });
});

describe('the location labels', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('follow the markers drawn, once a frame, where asked for', () => {
    const { result } = render({
      config: configWith([
        { section_id: 3, offset: 0.5 },
        { section_id: 8, offset: 0.5 },
      ]),
      showLabels: true,
    });
    const tell = result.current.locations?.onMarkersOnScreen;
    expect(tell).toBeDefined();

    act(() => {
      tell?.([
        { type: SectionType.ApicalDendrite, screen: { x: 0.1, y: 0.2 }, visible: true },
        null,
      ]);
      vi.advanceTimersByTime(20);
    });

    expect(result.current.labels).toEqual([
      {
        marker: { sectionType: SectionType.ApicalDendrite, sonataSectionId: 3 },
        screen: { x: 0.1, y: 0.2 },
        visible: true,
      },
    ]);
  });

  it('are not asked for unless shown', () => {
    const { result } = render({ config: configWith([{ section_id: 3, offset: 0.5 }]) });
    expect(result.current.locations?.onMarkersOnScreen).toBeUndefined();
    expect(result.current.labels).toEqual([]);
  });
});
