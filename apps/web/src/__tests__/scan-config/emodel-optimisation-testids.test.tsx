import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { IonChannelModelsPanel } from '@/features/scan-config/components/ui-blocks/emodel-optimisation/ion-channel-models-panel';
import { makeRegionEntry } from '@/features/scan-config/components/ui-blocks/emodel-optimisation/mechanism-regions';
import { ParameterRow } from '@/features/scan-config/components/ui-blocks/emodel-optimisation/parameter-row';
import { RegionChoiceCards } from '@/features/scan-config/components/ui-blocks/emodel-optimisation/region-choice-cards';
import { RegionModelsPanel } from '@/features/scan-config/components/ui-blocks/emodel-optimisation/region-models-panel';

import type { ConfigValue, IEModelOptimisationParameters } from '@/features/scan-config/types';

// The e2e suite addresses the Mechanisms section of the e-model optimisation
// form by test id: a section list by its schema name, a model by its entity id,
// a parameter by its NMODL name. Each is what the seed already carries, so no
// test has to know a card's label, which comes from obi-one's live schema.

vi.mock('@/ui/hooks/use-workspace', () => ({
  useWorkspace: () => ({ virtualLabId: 'vl-1', projectId: 'pj-1' }),
}));

vi.mock(
  '@/features/scan-config/components/ui-elements/model-identifier-multiple/use-resolved-entities',
  () => ({
    useResolvedModelIdentifierEntities: () => ({ entities: [], isLoading: false }),
  })
);

// picked refs must carry uuids to be recognised as FromID refs
const NA = '00000000-0000-4000-8000-00000000000a';
const KV = '00000000-0000-4000-8000-00000000000b';

const rootSchema = {
  properties: {
    mechanisms: { properties: { ion_channel_models: {} } },
    base_parameters: {
      choices: [
        { name: 'all', label: 'All sections', description: '', display_order: 0, available: true },
        { name: 'somatic', label: 'Somatic', description: '', display_order: 1, available: true },
      ],
    },
  },
} as unknown as IEModelOptimisationParameters;

/** Both models picked, and the sodium one assigned to `somatic`. */
const value: ConfigValue = {
  mechanisms: {
    ion_channel_models: [NA, KV].map((id) => ({ type: 'IonChannelModelFromID', id_str: id })),
    mechanism_regions: { somatic: [makeRegionEntry(NA)] },
  },
};

describe('e-model optimisation mechanisms test ids', () => {
  it('names each section list card by its schema name', () => {
    render(
      <RegionChoiceCards
        rootSchema={rootSchema}
        value={value}
        selectedRegionChoice="somatic"
        setSelectedRegionChoice={vi.fn()}
        errors={[]}
      />
    );

    expect(screen.getByTestId('scan-config-emodel-section-list-all')).toHaveTextContent(
      'All sections'
    );
    // the id is on the card itself, which says whether its drawer is open
    expect(screen.getByTestId('scan-config-emodel-section-list-somatic')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('names each model a section list can take by its entity id, around its checkbox', () => {
    render(
      <IonChannelModelsPanel
        choiceName="somatic"
        choiceLabel="Somatic"
        choiceDescription=""
        rootSchema={rootSchema}
        value={value}
        onChange={vi.fn()}
        errors={[]}
      />
    );

    expect(
      within(screen.getByTestId(`scan-config-emodel-assign-${NA}`)).getByRole('checkbox')
    ).toBeChecked();
    expect(
      within(screen.getByTestId(`scan-config-emodel-assign-${KV}`)).getByRole('checkbox')
    ).not.toBeChecked();
  });

  it('names each model assigned to a section list by its entity id', () => {
    render(
      <RegionModelsPanel
        choiceName="somatic"
        choiceLabel="Somatic"
        choiceDescription=""
        value={value}
        selectedRegionModel={NA}
        setSelectedRegionModel={vi.fn()}
        errors={[]}
      />
    );

    expect(screen.getByTestId(`scan-config-emodel-model-${NA}`)).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    // only what the section list holds is listed
    expect(screen.queryByTestId(`scan-config-emodel-model-${KV}`)).not.toBeInTheDocument();
  });

  it('names a parameter row by its NMODL name, holding its own controls', () => {
    render(
      <ParameterRow
        name="gNaTgbar"
        unit="S/cm2"
        checked
        errors={[]}
        optimizationValue={{ mode: 'bounds', value: null, bounds: [0, 0.3] }}
        onToggle={vi.fn()}
        onValueChange={vi.fn()}
      />
    );

    const row = within(screen.getByTestId('scan-config-emodel-parameter-gNaTgbar'));
    expect(row.getByRole('checkbox')).toBeChecked();
    expect(row.getByRole('radio', { name: 'Bounds' })).toBeChecked();
    expect(row.getByPlaceholderText('Min')).toHaveValue(0);
    expect(row.getByPlaceholderText('Max')).toHaveValue(0.3);
  });
});
