import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ModificationShell } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/shared/modification-shell';
import { ScanConfigUIElementDict } from '@/features/scan-config/types';

import type { MechanismVariablesRoot } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/shared/mapping';

const UI_ELEMENT = ScanConfigUIElementDict.IonChannelVariableModificationByNeuron;
const SOME_DATA: MechanismVariablesRoot = {
  NaTg: { section_lists: ['somatic'], entity_id: 'ic-natg', variables: {} },
};

function renderShell(props: Partial<React.ComponentProps<typeof ModificationShell>> = {}) {
  return render(
    <ModificationShell uiElement={UI_ELEMENT} data={null} loading={false} reason={null} {...props}>
      <div data-testid="picker">picker</div>
    </ModificationShell>
  );
}

describe('ModificationShell', () => {
  it('renders nothing when there is no data, loading, or reason (me-model idle state)', () => {
    const { container } = renderShell();

    expect(container).toBeEmptyDOMElement();
  });

  it('shows the loading note instead of the picker while fetching', () => {
    renderShell({ loading: true });

    expect(screen.getByText(/Loading variables/)).toBeInTheDocument();
    expect(screen.queryByTestId('picker')).not.toBeInTheDocument();
  });

  it('renders the picker once usable data is available', () => {
    const { container } = renderShell({ data: SOME_DATA });

    expect(screen.getByTestId('picker')).toBeInTheDocument();
    expect(
      container.querySelector(`[data-scan-config-block-element="${UI_ELEMENT}"]`)
    ).not.toBeNull();
  });

  it('renders a plain-string reason note in place of the picker', () => {
    renderShell({ reason: 'No ion-channel variables are available.', data: SOME_DATA });

    expect(screen.getByText('No ion-channel variables are available.')).toBeInTheDocument();
    expect(screen.queryByTestId('picker')).not.toBeInTheDocument();
  });

  it('renders a rich ReactNode reason (error headline + endpoint detail)', () => {
    renderShell({
      data: SOME_DATA,
      reason: (
        <div className="flex flex-col gap-1">
          <span className="text-error font-medium">Could not load variables.</span>
          <span className="text-gray-400">Neuron set &quot;exc&quot; not found.</span>
        </div>
      ),
    });

    expect(screen.getByText('Could not load variables.')).toBeInTheDocument();
    expect(screen.getByText('Neuron set "exc" not found.')).toBeInTheDocument();
    expect(screen.queryByTestId('picker')).not.toBeInTheDocument();
  });

  it('prefers the loading note over a reason when both are set', () => {
    renderShell({ loading: true, reason: 'should not show', data: SOME_DATA });

    expect(screen.getByText(/Loading variables/)).toBeInTheDocument();
    expect(screen.queryByText('should not show')).not.toBeInTheDocument();
  });
});
