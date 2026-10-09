import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { makeRegionEntry } from '@/features/scan-config/components/ui-blocks/emodel-optimisation/mechanism-regions';
import { RegionChoiceCards } from '@/features/scan-config/components/ui-blocks/emodel-optimisation/region-choice-cards';

import type { ConfigValue, IEModelOptimisationParameters } from '@/features/scan-config/types';

const NA = '00000000-0000-4000-8000-00000000000a';
const KV = '00000000-0000-4000-8000-00000000000b';

const rootSchema = {
  properties: {
    base_parameters: {
      choices: [
        { name: 'all', label: 'All sections', description: '', display_order: 0, available: true },
        { name: 'somatic', label: 'Somatic', description: '', display_order: 1, available: true },
      ],
    },
  },
} as unknown as IEModelOptimisationParameters;

/** Two models on `somatic`, one on `all`. */
const value: ConfigValue = {
  mechanisms: {
    ion_channel_models: [NA, KV].map((id) => ({ type: 'IonChannelModelFromID', id_str: id })),
    mechanism_regions: {
      somatic: [makeRegionEntry(NA), makeRegionEntry(KV)],
      all: [makeRegionEntry(NA)],
    },
  },
};

describe('RegionChoiceCards channel count', () => {
  it('shows the assigned channel count under each card', () => {
    render(
      <RegionChoiceCards
        rootSchema={rootSchema}
        value={value}
        selectedRegionChoice=""
        setSelectedRegionChoice={vi.fn()}
        errors={[]}
      />
    );

    expect(
      screen.getByTestId('scan-config-emodel-section-list-somatic-channel-count')
    ).toHaveTextContent('2 channels');
    expect(
      screen.getByTestId('scan-config-emodel-section-list-all-channel-count')
    ).toHaveTextContent('1 channel');
  });

  it('shows zero channels for an unassigned region', () => {
    render(
      <RegionChoiceCards
        rootSchema={rootSchema}
        value={{ mechanisms: { ion_channel_models: [], mechanism_regions: {} } }}
        selectedRegionChoice=""
        setSelectedRegionChoice={vi.fn()}
        errors={[]}
      />
    );

    expect(
      screen.getByTestId('scan-config-emodel-section-list-somatic-channel-count')
    ).toHaveTextContent('0 channels');
  });
});
