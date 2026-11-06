import { fireEvent, render, screen } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { describe, expect, it } from 'vitest';

import { CircuitViewToggle } from '@/ui/segments/explore/circuit/elements/view-toggle';
import {
  CircuitRepresentationView,
  circuitRepresentationViewAtom,
} from '@/ui/segments/explore/circuit/helpers';

describe('circuit view toggle', () => {
  it('stays on the flat list, and does not switch, while disabled', () => {
    const store = createStore();
    store.set(circuitRepresentationViewAtom, CircuitRepresentationView.Hierarchy);
    render(
      <Provider store={store}>
        <CircuitViewToggle dataKey="k" disabled />
      </Provider>
    );
    const toggle = screen.getByTestId('view-toggle');
    expect(toggle).toBeDisabled();
    expect(toggle.firstElementChild).toHaveClass('translate-x-[21px]');
    fireEvent.click(toggle);
    expect(store.get(circuitRepresentationViewAtom)).toBe(CircuitRepresentationView.Hierarchy);
  });
});
