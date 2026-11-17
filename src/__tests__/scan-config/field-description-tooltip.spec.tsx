import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FieldDescriptionTooltip } from '@/features/scan-config/components/shared/field-description-tooltip';
import { ScanHintTooltip } from '@/features/scan-config/components/shared/scan-hint';

function renderField() {
  render(
    <FieldDescriptionTooltip content="Field description">
      <span>
        <input aria-label="Value" />
        <ScanHintTooltip hint="Scan hint">
          <button type="button">Add</button>
        </ScanHintTooltip>
      </span>
    </FieldDescriptionTooltip>
  );
  return {
    input: screen.getByRole('textbox', { name: 'Value' }),
    plus: screen.getByRole('button', { name: 'Add' }),
  };
}

const shown = (text: string) =>
  screen.queryAllByRole('tooltip').some((tooltip) => tooltip.textContent === text);

describe('FieldDescriptionTooltip', () => {
  it('opens when the field takes focus', () => {
    const { input } = renderField();
    act(() => input.focus());
    expect(shown('Field description')).toBe(true);
  });

  it('stays shut while a scan + in the field has focus', () => {
    const { plus } = renderField();
    act(() => plus.focus());
    expect(shown('Scan hint')).toBe(true);
    expect(shown('Field description')).toBe(false);
  });

  it('does not open when focus moves on from a +', () => {
    // as when a + puts the cursor in the value it added
    const { input, plus } = renderField();
    act(() => plus.focus());
    act(() => input.focus());
    expect(shown('Field description')).toBe(false);
  });

  it('closes when a scan + in the field is hovered, until the field is hovered again', async () => {
    const { input, plus } = renderField();
    fireEvent.pointerMove(input);
    await waitFor(() => expect(shown('Field description')).toBe(true));
    fireEvent.pointerOver(plus);
    expect(shown('Field description')).toBe(false);
    fireEvent.pointerOver(input);
    expect(shown('Field description')).toBe(false);
    // the pointer leaves the field and comes back
    fireEvent.pointerLeave(input.parentElement as HTMLElement);
    fireEvent.pointerMove(input);
    await waitFor(() => expect(shown('Field description')).toBe(true));
  });
});
