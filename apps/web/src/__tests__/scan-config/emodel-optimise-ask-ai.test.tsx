import { render, screen } from '@testing-library/react';
import { Provider } from 'jotai';
import { describe, expect, it, vi } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import Left from '@/features/scan-config/components/ui-columns/left';
import { type ConfigSchema, ScanConfigActivity } from '@/features/scan-config/types';

// The AI panel button only needs the panel-state atom and the prompt atom, both module-level.
// No AI provider is required to render the button.

const schema = {
  group_order: ['Mechanisms'],
  properties: {
    emodel_optimisation_parameters: {
      group: 'Mechanisms',
      group_order: 0,
      ui_element: 'emodel_optimisation_parameters',
    },
  },
} as unknown as ConfigSchema;

function renderLeft(aiEnabled: boolean, activity = ScanConfigActivity.Optimize) {
  render(
    <Provider>
      <Left
        schema={schema}
        selectedRootElement="emodel_optimisation_parameters"
        setSelectedRootElement={vi.fn()}
        config={{}}
        setConfig={vi.fn()}
        campaignId=""
        loading={false}
        selectedEntry=""
        setSelectedEntry={vi.fn()}
        setEditing={vi.fn()}
        readOnly
        setCampaignId={vi.fn()}
        setLoading={vi.fn()}
        errors={null}
        setTab={vi.fn()}
        allEntries={new Set()}
        newKey=""
        setNewKey={vi.fn()}
        isEditingKey={false}
        setIsEditingKey={vi.fn()}
        activity={activity}
        generatedEndpoint="/generated"
        entityType={ExtendedEntitiesTypeDict.ElectricalCellRecording}
        aiEnabled={aiEnabled}
        selectedMechanismsTab=""
        setSelectedMechanismsTab={vi.fn()}
      />
    </Provider>
  );
}

describe('Left Ask AI button on Optimize', () => {
  it('shows the Ask AI button when aiEnabled is true', () => {
    renderLeft(true);
    expect(screen.getByText('Ask AI')).toBeInTheDocument();
  });

  it('hides the Ask AI button when aiEnabled is false', () => {
    renderLeft(false);
    expect(screen.queryByText('Ask AI')).not.toBeInTheDocument();
  });
});

describe('Left Ask AI button on Extract', () => {
  it('shows the Ask AI button when aiEnabled is true', () => {
    renderLeft(true, ScanConfigActivity.Extract);
    expect(screen.getByText('Ask AI')).toBeInTheDocument();
  });
});
