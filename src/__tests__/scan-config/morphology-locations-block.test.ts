import { describe, expect, it } from 'vitest';

import { morphologyLocationsColor } from '@/features/scan-config/components/color-by/palette';
import {
  collectLocations,
  supportsMorphologyLocationPicking,
} from '@/features/scan-config/components/model-preview/morphology-locations-block';

import type { Config } from '@/features/scan-config/types';

/** Two explicit blocks, one row each. */
const TWO_BLOCKS = {
  first: { type: 'ExplicitMorphologyLocations', locations: [{ section_id: 3, offset: 0.1 }] },
  second: { type: 'ExplicitMorphologyLocations', locations: [{ section_id: 1, offset: 0.2 }] },
};

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
        config: {
          morphology_locations: {
            block: {
              type: 'ExplicitMorphologyLocations',
              locations: [{ section_id: 3, offset: 0.5 }],
            },
          },
        },
        selectedRootElement: 'morphology_locations',
        selectedEntry: 'block',
      })
    ).toBe(true);
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
