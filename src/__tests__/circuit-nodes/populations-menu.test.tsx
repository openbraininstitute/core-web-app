import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PopulationsMenu } from '@/features/circuit-nodes/components/populations-menu';

import type { NodePopulation } from '@/features/circuit-nodes/types';

const POPULATIONS: NodePopulation[] = [
  { name: 'cortex', type: 'biophysical', file: 'nodes.h5' },
  { name: 'thalamus', type: 'biophysical', file: 'nodes.h5' },
  { name: 'vpm', type: 'virtual', file: 'nodes.h5' },
];

/** Renders the menu already open, since every assertion is about the panel. */
function open(props: Partial<React.ComponentProps<typeof PopulationsMenu>> = {}) {
  const onChange = vi.fn();
  const onSelect = vi.fn();
  render(
    <PopulationsMenu
      populations={POPULATIONS}
      hidden={[]}
      onChange={onChange}
      selected="cortex"
      onSelect={onSelect}
      {...props}
    />
  );
  fireEvent.click(screen.getByTestId('populations-menu-trigger'));
  return { onChange, onSelect };
}

/** The visibility checkbox for one population, by the label only it carries. */
function checkbox(name: string): HTMLInputElement {
  return screen.getByLabelText(`Show ${name}`);
}

describe('PopulationsMenu', () => {
  it('counts what is on screen, and spells out the fraction only once one is missing', () => {
    const { rerender } = render(
      <PopulationsMenu populations={POPULATIONS} hidden={[]} onChange={vi.fn()} />
    );
    // Anchored, or "Populations3" would also match the "3 of 3" this asserts
    // the pill does not say.
    expect(screen.getByTestId('populations-menu-trigger')).toHaveTextContent(/^Populations3$/);

    rerender(<PopulationsMenu populations={POPULATIONS} hidden={['vpm']} onChange={vi.fn()} />);
    expect(screen.getByTestId('populations-menu-trigger')).toHaveTextContent(/^Populations2 of 3$/);
  });

  it('checks the populations that are drawn and unchecks the ones that are not', () => {
    open({ hidden: ['thalamus'] });

    expect(checkbox('cortex').checked).toBe(true);
    expect(checkbox('thalamus').checked).toBe(false);
    expect(checkbox('vpm').checked).toBe(true);
  });

  it('takes a population out of the scene without disturbing the rest', () => {
    const { onChange } = open({ hidden: ['vpm'] });

    fireEvent.click(checkbox('cortex'));
    expect(onChange).toHaveBeenCalledWith(['vpm', 'cortex']);
  });

  it('puts one back', () => {
    const { onChange } = open({ hidden: ['cortex', 'vpm'] });

    fireEvent.click(checkbox('cortex'));
    expect(onChange).toHaveBeenCalledWith(['vpm']);
  });

  it('shows only one population by hiding every other', () => {
    const { onChange } = open();

    fireEvent.click(screen.getByRole('button', { name: 'Show only thalamus' }));
    expect(onChange).toHaveBeenCalledWith(['cortex', 'vpm']);
  });

  it('shows only one population even when that one was itself hidden', () => {
    const { onChange } = open({ hidden: ['thalamus'] });

    fireEvent.click(screen.getByRole('button', { name: 'Show only thalamus' }));
    expect(onChange).toHaveBeenCalledWith(['cortex', 'vpm']);
  });

  it('brings everything back, and offers nothing to bring back when nothing is gone', () => {
    const { onChange } = open({ hidden: ['cortex', 'vpm'] });

    const showAll = screen.getByTestId('populations-menu-show-all');
    expect(showAll).toBeEnabled();
    fireEvent.click(showAll);
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('leaves Show all dead while every population is on screen', () => {
    open({ hidden: [] });

    expect(screen.getByTestId('populations-menu-show-all')).toBeDisabled();
  });

  it('marks which population is on show, and can put another one there', () => {
    const { onSelect, onChange } = open({ selected: 'thalamus' });

    // Anchored: the row's other button is "Show only thalamus", and matching
    // both would assert against whichever came first.
    expect(screen.getByRole('button', { name: /^thalamus/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: /^cortex/ })).toHaveAttribute(
      'aria-pressed',
      'false'
    );

    fireEvent.click(screen.getByRole('button', { name: /^cortex/ }));
    expect(onSelect).toHaveBeenCalledWith('cortex');
    // Putting a population on show says nothing about what is drawn — the two
    // are separate questions, on separate targets.
    expect(onChange).not.toHaveBeenCalled();
  });

  it('offers no way to change what is on show when the host pins it', () => {
    open({ selected: 'cortex', onSelect: undefined });

    expect(screen.queryByRole('button', { name: /^cortex/ })).toBeNull();
    // The checkbox is still there: pinning which population is on show says
    // nothing about which ones are drawn around it.
    expect(checkbox('cortex')).toBeInTheDocument();
  });
});
