import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  POPULATIONS_MENU_INTRODUCED_KEY,
  PopulationsMenu,
} from '@/features/circuit-nodes/components/populations-menu';

import { installLocalStorage } from '../auth-manager/install-local-storage';

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

  // Both halves of one gesture: the population left in the scene is also the
  // one put on show. Without the second half the only thing drawn would be
  // drawn receded, and the nodes table would list a population that is not in
  // the scene at all.
  it('shows only one population by hiding every other, and puts that one on show', () => {
    const { onChange, onSelect } = open();

    fireEvent.click(screen.getByRole('button', { name: 'Show only thalamus' }));
    expect(onChange).toHaveBeenCalledWith(['cortex', 'vpm']);
    expect(onSelect).toHaveBeenCalledWith('thalamus');
  });

  it('shows only one population even when that one was itself hidden', () => {
    const { onChange } = open({ hidden: ['thalamus'] });

    fireEvent.click(screen.getByRole('button', { name: 'Show only thalamus' }));
    expect(onChange).toHaveBeenCalledWith(['cortex', 'vpm']);
  });

  // Nothing else to do about it: the host owns that choice, and the scene it
  // leaves is the one the host asked for.
  it('still shows only one population where the host pins what is on show', () => {
    const { onChange } = open({ selected: 'cortex', onSelect: undefined });

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
    // Putting a population on show says nothing about what is drawn. They are
    // separate questions on separate targets, and only the row's "Only" answers
    // both at once.
    expect(onChange).not.toHaveBeenCalled();
  });

  // The panel is portalled, so closing on an outside click is our own
  // handler's job rather than the DOM's.
  it('closes on a pointer landing outside it', () => {
    open();
    expect(screen.getByTestId('populations-menu-content')).toBeInTheDocument();

    fireEvent.pointerDown(document.body);
    expect(screen.queryByTestId('populations-menu-content')).toBeNull();
  });

  // And why it listens in the capture phase: the panel sits over a WebGL canvas
  // that stops pointerdown from bubbling.
  it('closes on a pointer the page stops from bubbling', () => {
    open();
    const canvas = document.createElement('div');
    canvas.addEventListener('pointerdown', (event) => event.stopPropagation());
    document.body.append(canvas);

    fireEvent.pointerDown(canvas);

    expect(screen.queryByTestId('populations-menu-content')).toBeNull();
    canvas.remove();
  });

  it('offers no way to change what is on show when the host pins it', () => {
    open({ selected: 'cortex', onSelect: undefined });

    expect(screen.queryByRole('button', { name: /^cortex/ })).toBeNull();
    // The checkbox is still there: pinning which population is on show says
    // nothing about which ones are drawn around it.
    expect(checkbox('cortex')).toBeInTheDocument();
  });
});

describe('PopulationsMenu introduction', () => {
  // `localStorage` is Node's own global from Node 24 on, undefined without a
  // flag. A fresh one each time is also the no-previous-visit case, the only
  // one the checklist opens itself in.
  beforeEach(() => installLocalStorage());

  function introduce(autoOpen: boolean, hidden: string[] = ['vpm']) {
    return (
      <PopulationsMenu
        populations={POPULATIONS}
        hidden={hidden}
        onChange={vi.fn()}
        autoOpen={autoOpen}
      />
    );
  }

  it('opens itself the first time a user is shown it', () => {
    render(introduce(true));

    expect(screen.getByTestId('populations-menu-content')).toBeInTheDocument();
    expect(checkbox('vpm').checked).toBe(false);
  });

  // Left to Radix the focus lands on "Show all": a ring on a panel nobody
  // opened, and Enter puts every population back.
  it('takes the focus itself rather than putting it on a control', () => {
    render(introduce(true));

    expect(screen.getByTestId('populations-menu-content')).toHaveFocus();
    expect(screen.getByTestId('populations-menu-show-all')).not.toHaveFocus();
  });

  it('leaves itself shut for a user who has already met it', () => {
    const { unmount } = render(introduce(true));
    expect(screen.getByTestId('populations-menu-content')).toBeInTheDocument();
    unmount();

    render(introduce(true));
    expect(screen.queryByTestId('populations-menu-content')).toBeNull();
  });

  // The panel opens itself to say what is missing from the scene. With nothing
  // missing, the one introduction is better kept for a circuit that has some.
  it('keeps the introduction back on a circuit that hides nothing', () => {
    render(introduce(true, []));

    expect(screen.queryByTestId('populations-menu-content')).toBeNull();
    expect(localStorage.getItem(POPULATIONS_MENU_INTRODUCED_KEY)).toBeNull();
  });

  // The host holds it back while the checklist is mounted but off screen,
  // where the one introduction would be seen by nobody.
  it('waits for the host rather than spending the introduction unseen', () => {
    const { rerender } = render(introduce(false));
    expect(screen.queryByTestId('populations-menu-content')).toBeNull();
    expect(localStorage.getItem(POPULATIONS_MENU_INTRODUCED_KEY)).toBeNull();

    rerender(introduce(true));
    expect(screen.getByTestId('populations-menu-content')).toBeInTheDocument();
  });
});
