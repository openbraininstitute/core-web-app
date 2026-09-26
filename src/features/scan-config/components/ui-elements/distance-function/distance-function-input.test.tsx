import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useFieldErrors } from '@/features/scan-config/components/hooks/field-errors';
import { DistanceFunctionInput } from '@/features/scan-config/components/ui-elements/distance-function/distance-function-input';

/** Renders the current field-error keys so a test can assert what was published. */
function FieldErrorKeysProbe() {
  const errors = useFieldErrors();
  return <div data-testid="field-error-keys">{[...errors.keys()].join(',')}</div>;
}

describe('DistanceFunctionInput', () => {
  it('renders the editor with the given value', async () => {
    render(<DistanceFunctionInput value="math.exp({distance})*{value}" onChange={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText(/math\.exp/)).toBeInTheDocument();
    });
  });

  it('shows a lint diagnostic for an unsafe function', async () => {
    render(
      <DistanceFunctionInput value="os.system('id') + {value} + {distance}" onChange={() => {}} />
    );
    // CodeMirror runs its linter asynchronously (default ~750ms debounce); wait for the mark.
    await waitFor(
      () => {
        const container = document.querySelector('.cm-editor');
        expect(container?.querySelector('.cm-lintRange-error')).toBeTruthy();
      },
      { timeout: 3000 }
    );
  });

  it('outlines the input in red and shows a message when the value is invalid', () => {
    render(<DistanceFunctionInput value="a + b" onChange={() => {}} />);
    const control = screen.getByTestId('scan-config-control');
    expect(control.className).toContain('border-red-500');
    expect(control.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert')).toHaveTextContent(/disallowed name/);
  });

  it('does not outline in red for a valid value', () => {
    render(<DistanceFunctionInput value="{value} + {distance}" onChange={() => {}} />);
    const control = screen.getByTestId('scan-config-control');
    expect(control.className).not.toContain('border-red-500');
    expect(control.getAttribute('aria-invalid')).toBe('false');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('clears the error when a parameter is declared without editing the function', async () => {
    const fn = '{value} + {distance} + {constant}';
    const { rerender } = render(<DistanceFunctionInput value={fn} onChange={() => {}} />);
    // Unknown placeholder -> red outline.
    expect(screen.getByTestId('scan-config-control').className).toContain('border-red-500');
    // Declaring `constant` (elsewhere in the form) should clear it, no function edit needed.
    rerender(
      <DistanceFunctionInput value={fn} onChange={() => {}} declaredParameters={['constant']} />
    );
    expect(screen.getByTestId('scan-config-control').className).not.toContain('border-red-500');
    expect(screen.queryByRole('alert')).toBeNull();
    // The inline squiggle must clear too (the linter is reconfigured on parameter change).
    await waitFor(
      () => {
        const container = document.querySelector('.cm-editor');
        expect(container?.querySelector('.cm-lintRange-error')).toBeFalsy();
      },
      { timeout: 3000 }
    );
  });

  it('publishes a field error at errorPath when the function is invalid', () => {
    const path = 'distance_dependent_distributions/mouse_decay/function';
    render(
      <>
        <DistanceFunctionInput value="a + b" onChange={() => {}} errorPath={path} />
        <FieldErrorKeysProbe />
      </>
    );
    expect(screen.getByTestId('field-error-keys')).toHaveTextContent(path);
  });

  it('publishes no field error when the function is valid', () => {
    render(
      <>
        <DistanceFunctionInput
          value="{value} + {distance}"
          onChange={() => {}}
          errorPath="distance_dependent_distributions/decay/function"
        />
        <FieldErrorKeysProbe />
      </>
    );
    expect(screen.getByTestId('field-error-keys')).toHaveTextContent('');
  });

  it('clears the field error when the invalid entry unmounts', () => {
    const path = 'distance_dependent_distributions/mouse_decay/function';
    const { rerender } = render(
      <>
        <DistanceFunctionInput value="a + b" onChange={() => {}} errorPath={path} />
        <FieldErrorKeysProbe />
      </>
    );
    expect(screen.getByTestId('field-error-keys')).toHaveTextContent(path);
    // Unmounting the input (e.g. switching entries) must drop its error.
    rerender(<FieldErrorKeysProbe />);
    expect(screen.getByTestId('field-error-keys')).toHaveTextContent('');
  });
});
