import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { buildCellRenderers } from '@/features/data-grid/bindings/entitycore/cell-renderers';
import { getEntityGridDefinition } from '@/features/data-grid/bindings/entitycore/registry';
import {
  DESCRIPTION_RENDERER,
  DescriptionCell,
} from '@/features/data-grid/bindings/entitycore/renderers/description-cell';
import { EMPTY_PLACEHOLDER } from '@/features/data-grid/renderers/aggrid/empty-cell';

import type { TAnyEntityGridDefinition } from '@/features/data-grid/bindings/entitycore/registry';
import type { ICellRendererProps } from '@/features/data-grid/react';

const REGISTERED_DATA_TYPES: ReadonlyArray<string> = [
  'analysis_notebook_result',
  'analysis_notebook_template',
  'brain_region',
  'circuit',
  'micro_circuit',
  'paired_neuron_circuit',
  'simulatable_extracellular_recording_array',
  'simulation_campaign',
  'single_neuron_circuit',
  'single_neuron_synaptome',
  'single_neuron_synaptome_simulation',
  'small_micro_circuit',
  'whole_brain',
];

function definitionFor(dataType: string): TAnyEntityGridDefinition {
  const definition = getEntityGridDefinition(dataType);
  if (!definition) throw new Error(`no registered grid definition for ${dataType}`);
  return definition;
}

const LONG = 'A circuit of the primary somatosensory cortex, built from reconstructed cells.';

const METRICS = ['scrollHeight', 'clientHeight', 'clientWidth'] as const;

function stubMetrics(metrics: Partial<Record<(typeof METRICS)[number], number>>) {
  for (const [prop, value] of Object.entries(metrics)) {
    Object.defineProperty(HTMLParagraphElement.prototype, prop, {
      configurable: true,
      value,
    });
  }
}

function stubOverflow(overflowing: boolean) {
  stubMetrics({ scrollHeight: overflowing ? 60 : 36, clientHeight: 36, clientWidth: 320 });
}

afterEach(() => {
  for (const prop of METRICS) {
    Reflect.deleteProperty(HTMLParagraphElement.prototype, prop);
  }
});

function renderCell(value: unknown) {
  return render(
    <DescriptionCell {...({ value, row: {}, rowIndex: 0 } as ICellRendererProps<unknown>)} />
  );
}

const moreButton = () => screen.queryByRole('button', { name: 'Show the full description' });

describe('description cell', () => {
  it('is registered under the key the description column references', () => {
    expect(DESCRIPTION_RENDERER).toBe('description');
  });

  it('shows the text clamped to two lines, with no button while it all fits', () => {
    stubOverflow(false);
    renderCell(LONG);

    const paragraph = screen.getByText(LONG);
    expect(paragraph.className).toContain('line-clamp-2');
    expect(paragraph.className).toContain('whitespace-normal');
    expect(moreButton()).not.toBeInTheDocument();
  });

  it('ignores the sub-pixel overshoot of a line that is not actually clipped', () => {
    stubMetrics({ scrollHeight: 20, clientHeight: 18, clientWidth: 318 });
    renderCell('Test larger input range');

    expect(moreButton()).not.toBeInTheDocument();
  });

  it('still catches a real hidden line', () => {
    stubMetrics({ scrollHeight: 56, clientHeight: 36, clientWidth: 318 });
    renderCell(LONG);

    expect(moreButton()).toBeInTheDocument();
  });

  it('stays hidden while the cell has no layout yet, however long the text', () => {
    stubMetrics({ scrollHeight: 60, clientHeight: 0, clientWidth: 0 });
    renderCell(LONG);

    expect(screen.getByText(LONG)).toBeInTheDocument();
    expect(moreButton()).not.toBeInTheDocument();
  });

  it('stays hidden while the column has collapsed to no width', () => {
    stubMetrics({ scrollHeight: 60, clientHeight: 36, clientWidth: 0 });
    renderCell(LONG);

    expect(moreButton()).not.toBeInTheDocument();
  });

  it('keeps the text box a constant width whether or not the button is shown', () => {
    stubOverflow(true);
    renderCell(LONG);

    const paragraph = screen.getByText(LONG);
    expect(paragraph.className).toContain('w-full');
    expect(paragraph.className).toContain('pr-7');
    expect(moreButton()?.className).toContain('absolute');
  });

  it('offers the button once the text overflows, and the popover holds all of it', () => {
    stubOverflow(true);
    renderCell(LONG);

    const button = moreButton();
    expect(button).toBeInTheDocument();

    fireEvent.click(button as HTMLElement);

    expect(screen.getAllByText(LONG)).toHaveLength(2);
    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  it('prints the shared placeholder for an absent or blank description', () => {
    stubOverflow(false);
    const { unmount } = renderCell('');
    expect(screen.getByText(EMPTY_PLACEHOLDER)).toBeInTheDocument();
    expect(moreButton()).not.toBeInTheDocument();
    unmount();

    renderCell(null);
    expect(screen.getByText(EMPTY_PLACEHOLDER)).toBeInTheDocument();
  });

  it('trims surrounding whitespace rather than treating it as content', () => {
    stubOverflow(false);
    renderCell('   \n  ');
    expect(screen.getByText(EMPTY_PLACEHOLDER)).toBeInTheDocument();
  });
});

describe('description cell — wiring across every listing that shows one', () => {
  it('every description column routes through the renderer, and the registry has it', () => {
    const withDescription = REGISTERED_DATA_TYPES.map((dataType) => ({
      dataType,
      column: definitionFor(dataType).schema.columns.find((c) => c.header === 'Description'),
    })).filter((e) => e.column);

    expect(withDescription.length).toBeGreaterThan(5);

    for (const { dataType, column } of withDescription) {
      expect(column?.cellRenderer, dataType).toBe(DESCRIPTION_RENDERER);
      expect(buildCellRenderers(definitionFor(dataType)).has(DESCRIPTION_RENDERER)).toBe(true);
    }
  });
});
