import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { IonChannelModelsPanel } from '@/features/scan-config/components/ui-blocks/emodel-optimisation/ion-channel-models-panel';
import { makeRegionEntry } from '@/features/scan-config/components/ui-blocks/emodel-optimisation/mechanism-regions';

import type { ConfigValue, IEModelOptimisationParameters } from '@/features/scan-config/types';

vi.mock('@/ui/hooks/use-workspace', () => ({
  useWorkspace: () => ({ virtualLabId: 'vl-1', projectId: 'pj-1' }),
}));

vi.mock(
  '@/features/scan-config/components/ui-elements/model-identifier-multiple/use-resolved-entities',
  () => ({
    useResolvedModelIdentifierEntities: () => ({ entities: [], isLoading: false }),
  })
);

const rootSchema = {
  properties: { mechanisms: { properties: { ion_channel_models: {} } } },
} as unknown as IEModelOptimisationParameters;

// picked refs must carry uuids to be recognised as FromID refs
const A = '00000000-0000-4000-8000-00000000000a';
const B = '00000000-0000-4000-8000-00000000000b';
const C = '00000000-0000-4000-8000-00000000000c';

/** Models A, B, C picked; `somatic` holds A (with a parameter). */
function partlyAssigned(): ConfigValue {
  return {
    mechanisms: {
      ion_channel_models: [A, B, C].map((id) => ({
        type: 'IonChannelModelFromID',
        id_str: id,
      })),
      mechanism_regions: {
        somatic: [{ ...makeRegionEntry(A), parameters: { gbar: 'kept' } }],
      },
    },
  };
}

function renderPanel(value: ConfigValue) {
  const onChange = vi.fn();
  render(
    <IonChannelModelsPanel
      choiceName="somatic"
      choiceLabel="Somatic"
      choiceDescription=""
      rootSchema={rootSchema}
      value={value}
      onChange={onChange}
    />
  );
  return { onChange, selectAll: screen.getByLabelText('Select all ion channel models') };
}

describe('IonChannelModelsPanel select all', () => {
  it('is indeterminate while only some models are assigned', () => {
    const { selectAll } = renderPanel(partlyAssigned());
    expect(selectAll.closest('.ant-checkbox')?.classList).toContain('ant-checkbox-indeterminate');
  });

  it('assigns the missing models and keeps existing entries with their parameters', () => {
    const { onChange, selectAll } = renderPanel(partlyAssigned());
    fireEvent.click(selectAll);

    const next = onChange.mock.calls[0][0];
    expect(next.mechanisms.mechanism_regions.somatic).toEqual([
      { ...makeRegionEntry(A), parameters: { gbar: 'kept' } },
      makeRegionEntry(B),
      makeRegionEntry(C),
    ]);
  });

  it('unassigns every model', () => {
    const value = partlyAssigned() as {
      mechanisms: { mechanism_regions: Record<string, unknown> };
    };
    value.mechanisms.mechanism_regions.somatic = [A, B, C].map(makeRegionEntry);

    const { onChange, selectAll } = renderPanel(value as ConfigValue);
    fireEvent.click(selectAll);

    const next = onChange.mock.calls[0][0];
    expect(next.mechanisms.mechanism_regions.somatic).toEqual([]);
  });
});
