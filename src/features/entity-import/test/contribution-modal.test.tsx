import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { makeSelectContributionEntityClickEvent } from '@/ui/segments/contribute/event';
import { ContributionModal } from '@/ui/segments/contribute/modal';

const { cellMorphologyLabel, electricalCellRecordingLabel, mockedEntityConfiguration } = vi.hoisted(
  () => ({
    cellMorphologyLabel: 'Cell Morphology',
    electricalCellRecordingLabel: 'Electrical Cell Recording',
    mockedEntityConfiguration: {
      CellMorphology: {
        title: 'Cell Morphology',
        extendedType: 'cell_morphology',
        isContributionOption: true,
        isContributable: true,
      },
      ElectricalCellRecording: {
        title: 'Electrical Cell Recording',
        extendedType: 'electrical_cell_recording',
        isContributionOption: true,
        isContributable: true,
      },
    } as const,
  })
);

vi.mock('@/entity-configuration/domain', () => ({
  EntityCoreConfiguration: mockedEntityConfiguration,
}));

vi.mock('@/entity-configuration/domain/helpers', () => ({
  getEntityByExtendedType: ({ type }: { type?: string }) =>
    Object.values(mockedEntityConfiguration).find((entity) => entity.extendedType === type),
}));

vi.mock('@/ui/molecules/modal', () => ({
  Modal: ({
    open,
    title,
    children,
  }: {
    open: boolean;
    title?: React.ReactNode;
    children: React.ReactNode;
  }) =>
    open ? (
      <div role="dialog">
        <div>{title}</div>
        <div>{children}</div>
      </div>
    ) : null,
}));

vi.mock('@/ui/molecules/select-popover', () => ({
  SelectPopover: ({
    options,
    onSelect,
  }: {
    options: Array<{ label: string; value: string; data?: { disabled?: boolean } }>;
    onSelect?: (option: { label: string; value: string; data?: { disabled?: boolean } }) => void;
  }) => (
    <div>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={option.data?.disabled}
          onClick={() => {
            if (!option.data?.disabled) {
              onSelect?.(option);
            }
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('@/ui/segments/contribute/cell-morphology', () => ({
  CellMorphology: ({ sessionId }: { sessionId: string }) => (
    <div data-testid="legacy-cell-morphology">{sessionId}</div>
  ),
  CellMorphologyImport: ({ sessionId }: { sessionId: string }) => (
    <div data-testid="import-cell-morphology">{sessionId}</div>
  ),
}));

vi.mock('@/ui/segments/contribute/electrical-cell-recording', () => ({
  ElectricalCellRecording: ({ sessionId }: { sessionId: string }) => <div>{sessionId}</div>,
}));

vi.mock('@/ui/segments/contribute/em-cell-mesh', () => ({
  EMCellMesh: ({ sessionId }: { sessionId: string }) => <div>{sessionId}</div>,
}));

vi.mock('@/ui/segments/contribute/experimental-bouton-density', () => ({
  ExperimentalBoutonDensity: ({ sessionId }: { sessionId: string }) => <div>{sessionId}</div>,
}));

vi.mock('@/ui/segments/contribute/experimental-neuron-density', () => ({
  ExperimentalNeuronDensity: ({ sessionId }: { sessionId: string }) => <div>{sessionId}</div>,
}));

vi.mock('@/ui/segments/contribute/synapses-per-connection', () => ({
  ExperimentalSynapsesPerConnection: ({ sessionId }: { sessionId: string }) => (
    <div>{sessionId}</div>
  ),
}));

describe('ContributionModal', () => {
  it('shows legacy and csv import selectors with unsupported import artifacts disabled', async () => {
    render(<ContributionModal />);

    act(() => {
      makeSelectContributionEntityClickEvent({
        display: true,
        entityType: null,
        sessionId: 'session-1',
      });
    });

    expect(await screen.findByTestId('legacy-form-selector')).toBeInTheDocument();
    expect(screen.getByTestId('csv-import-selector')).toBeInTheDocument();

    const legacyFormSelector = within(screen.getByTestId('legacy-form-selector'));
    const csvImportSelector = within(screen.getByTestId('csv-import-selector'));

    expect(legacyFormSelector.getByRole('button', { name: cellMorphologyLabel })).toBeEnabled();
    expect(csvImportSelector.getByRole('button', { name: cellMorphologyLabel })).toBeEnabled();
    expect(
      csvImportSelector.getByRole('button', { name: electricalCellRecordingLabel })
    ).toBeDisabled();
  });

  it('opens the import renderer when selecting a supported artifact from the csv import selector', async () => {
    const user = userEvent.setup();

    render(<ContributionModal />);

    act(() => {
      makeSelectContributionEntityClickEvent({
        display: true,
        entityType: null,
        sessionId: 'session-1',
      });
    });

    const csvImportSelector = within(await screen.findByTestId('csv-import-selector'));

    await user.click(csvImportSelector.getByRole('button', { name: cellMorphologyLabel }));

    expect(await screen.findByTestId('import-cell-morphology')).toHaveTextContent('session-1');
  });
});
