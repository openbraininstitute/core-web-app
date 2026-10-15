import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { useFieldErrors } from '@/features/scan-config/components/hooks/field-errors';
import { defaultOptimizationValue } from '@/features/scan-config/components/ui-blocks/emodel-optimisation/mechanism-regions';
import {
  DistributionParameterList,
  distributionParameterRows,
  readParameterRows,
  type TDistributionParameter,
} from '@/features/scan-config/components/ui-elements/distance-function/distribution-parameter-list';

/** Renders the current field-error keys so a test can assert what was published. */
function FieldErrorKeysProbe() {
  const errors = useFieldErrors();
  return <div data-testid="field-error-keys">{[...errors.keys()].join(',')}</div>;
}

/**
 * Controlled wrapper mirroring the dispatcher: holds the stored rows in state, derives the rows to
 * render from the function text, and feeds edits back. The function is the source of truth, so the
 * rendered rows always follow `functionText`.
 */
function Harness({
  functionText,
  initial = [],
  errorPath,
}: {
  functionText: string;
  initial?: TDistributionParameter[];
  errorPath?: string;
}) {
  const [stored, setStored] = useState<TDistributionParameter[]>(initial);
  const rows = distributionParameterRows(functionText, stored);
  return (
    <>
      <DistributionParameterList
        rows={rows}
        stored={stored}
        onChange={setStored}
        errorPath={errorPath}
      />
      <div data-testid="rows-json">{JSON.stringify(stored)}</div>
    </>
  );
}

describe('distributionParameterRows', () => {
  it('keeps stored values for names still present and adds empty rows for new names', () => {
    const stored: TDistributionParameter[] = [
      { name: 'a', value: { mode: 'fixed', value: 2, bounds: null } },
    ];
    expect(distributionParameterRows('{value}*{a}+{b}', stored)).toEqual([
      { name: 'a', value: { mode: 'fixed', value: 2, bounds: null } },
      { name: 'b', value: defaultOptimizationValue() },
    ]);
  });

  it('drops rows whose name is no longer in the function and follows function order', () => {
    const stored: TDistributionParameter[] = [
      { name: 'a', value: { mode: 'fixed', value: 1, bounds: null } },
      { name: 'b', value: { mode: 'fixed', value: 2, bounds: null } },
    ];
    expect(distributionParameterRows('{value}*{b}', stored)).toEqual([
      { name: 'b', value: { mode: 'fixed', value: 2, bounds: null } },
    ]);
  });
});

describe('readParameterRows', () => {
  it('reads the stored config array, dropping malformed entries', () => {
    expect(
      readParameterRows([
        { name: 'a', value: { mode: 'bounds', bounds: [-0.1, 0] } },
        { value: { mode: 'fixed', value: 1 } }, // no name -> dropped
        'nonsense',
      ])
    ).toEqual([{ name: 'a', value: { mode: 'bounds', value: null, bounds: [-0.1, 0] } }]);
  });

  it('returns an empty list for a non-array value', () => {
    expect(readParameterRows(null)).toEqual([]);
  });
});

describe('DistributionParameterList', () => {
  it('shows a hint and no rows when the function declares no parameters', () => {
    render(<Harness functionText="math.exp(-{distance}/50.)*{value}" />);
    expect(screen.getByText(/No parameters/)).toBeInTheDocument();
    expect(screen.queryByTestId(/scan-config-distribution-parameter-/)).toBeNull();
  });

  it('renders one row per extra placeholder in the function', () => {
    render(<Harness functionText="{value}*{a}+{b}" />);
    expect(screen.getByTestId('scan-config-distribution-parameter-a')).toBeInTheDocument();
    expect(screen.getByTestId('scan-config-distribution-parameter-b')).toBeInTheDocument();
  });

  it('writes a fixed value for a parameter', async () => {
    render(<Harness functionText="{value}*{a}" />);
    const row = screen.getByTestId('scan-config-distribution-parameter-a');
    fireEvent.change(within(row).getByLabelText('a value'), { target: { value: '3' } });
    await waitFor(() => {
      expect(JSON.parse(screen.getByTestId('rows-json').textContent ?? '[]')).toEqual([
        { name: 'a', value: { mode: 'fixed', value: 3, bounds: null } },
      ]);
    });
  });

  it('switches to bounds mode and writes the pair', async () => {
    render(<Harness functionText="{value}*{a}" />);
    const row = screen.getByTestId('scan-config-distribution-parameter-a');
    fireEvent.click(within(row).getByLabelText('Bounds'));
    fireEvent.change(within(row).getByLabelText('a min'), { target: { value: '-1' } });
    fireEvent.change(within(row).getByLabelText('a max'), { target: { value: '2' } });
    await waitFor(() => {
      expect(JSON.parse(screen.getByTestId('rows-json').textContent ?? '[]')).toEqual([
        { name: 'a', value: { mode: 'bounds', value: null, bounds: [-1, 2] } },
      ]);
    });
  });

  it('flags bounds that do not increase', () => {
    render(
      <Harness
        functionText="{value}*{a}"
        initial={[{ name: 'a', value: { mode: 'bounds', value: null, bounds: [2, 1] } }]}
      />
    );
    expect(screen.getByText(/Max must be greater than min/)).toBeInTheDocument();
  });

  it('publishes a field error at errorPath while a value is missing, and clears it once set', async () => {
    const path = 'distance_dependent_distributions/mouse/parameters';
    render(
      <>
        <Harness functionText="{value}*{a}" errorPath={path} />
        <FieldErrorKeysProbe />
      </>
    );
    await waitFor(() => {
      expect(screen.getByTestId('field-error-keys')).toHaveTextContent(path);
    });
    const row = screen.getByTestId('scan-config-distribution-parameter-a');
    fireEvent.change(within(row).getByLabelText('a value'), { target: { value: '5' } });
    await waitFor(() => {
      expect(screen.getByTestId('field-error-keys')).not.toHaveTextContent(path);
    });
  });
});
