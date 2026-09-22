import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DiscreteProbabilities } from '@/features/scan-config/components/ui-elements/discrete-probabilities';

function renderTable(
  values: number[],
  probabilities: number[],
  { disabled = false }: { disabled?: boolean } = {}
) {
  const onChange = vi.fn();
  render(
    <DiscreteProbabilities
      values={values}
      probabilities={probabilities}
      onChange={onChange}
      disabled={disabled}
    />
  );
  return onChange;
}

describe('DiscreteProbabilities', () => {
  it('shows one row per value', () => {
    renderTable([1, 2, 3], [0.5, 0.3, 0.2]);

    expect(screen.getByLabelText('Value 1')).toHaveValue('1');
    expect(screen.getByLabelText('Value 3')).toHaveValue('3');
    expect(screen.queryByLabelText('Value 4')).toBeNull();
  });

  it('shows each probability as a share of the total, since they are normalised', () => {
    renderTable([1, 2, 3], [1, 1, 1]);

    expect(screen.getAllByText('33.3%')).toHaveLength(3);
  });

  it('writes both arrays together when a value changes', () => {
    const onChange = renderTable([1, 2], [0.5, 0.5]);

    fireEvent.change(screen.getByLabelText('Value 2'), { target: { value: '7' } });

    expect(onChange).toHaveBeenCalledWith([1, 7], [0.5, 0.5]);
  });

  it('adds a whole row, so the two arrays cannot drift apart', () => {
    const onChange = renderTable([1, 2], [0.5, 0.5]);

    fireEvent.click(screen.getByText('Add value'));

    const [values, probabilities] = onChange.mock.calls[0];
    expect(values).toHaveLength(probabilities.length);
  });

  it('removes a whole row', () => {
    const onChange = renderTable([1, 2, 3], [0.5, 0.3, 0.2]);

    fireEvent.click(screen.getByLabelText('Remove value 2'));

    expect(onChange).toHaveBeenCalledWith([1, 3], [0.5, 0.2]);
  });

  it('refuses to remove the last row, which would leave nothing to sample', () => {
    const onChange = renderTable([1], [1]);

    fireEvent.click(screen.getByLabelText('Remove value 1'));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('says so when no value could be drawn', () => {
    renderTable([1, 2], [0, 0]);

    expect(screen.getByText(/at least one probability/i)).toBeInTheDocument();
  });

  it('renders a mismatched pair rather than silently dropping the extra values', () => {
    renderTable([1, 2, 3, 4], [0.5, 0.5]);

    expect(screen.getByLabelText('Value 4')).toBeInTheDocument();
    expect(screen.getByLabelText('Probability 4')).toHaveValue('');
  });

  it('keeps rows aligned when editing past the end of the shorter array', () => {
    const onChange = renderTable([1, 2, 3, 4], [0.5, 0.5]);

    fireEvent.change(screen.getByLabelText('Probability 4'), { target: { value: '0.3' } });

    expect(onChange).toHaveBeenCalledWith([1, 2, 3, 4], [0.5, 0.5, 0, 0.3]);
  });

  it('adds the new row after the last one when the arrays differ in length', () => {
    const onChange = renderTable([1, 2, 3, 4], [0.5, 0.5]);

    fireEvent.click(screen.getByText('Add value'));

    expect(onChange).toHaveBeenCalledWith([1, 2, 3, 4, 5], [0.5, 0.5, 0, 0, 0]);
  });

  it('offers no editing controls when disabled', () => {
    renderTable([1, 2], [0.5, 0.5], { disabled: true });

    expect(screen.queryByText('Add value')).toBeNull();
    expect(screen.queryByLabelText('Remove value 1')).toBeNull();
  });
});
