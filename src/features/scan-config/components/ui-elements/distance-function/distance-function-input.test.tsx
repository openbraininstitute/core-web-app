import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { validateDistanceFunction } from '@/api/one/distance-function';
import { useFieldErrors } from '@/features/scan-config/components/hooks/field-errors';
import { DistanceFunctionInput } from '@/features/scan-config/components/ui-elements/distance-function/distance-function-input';

vi.mock('@/api/one/distance-function', () => ({
  validateDistanceFunction: vi.fn(),
}));

const mockValidate = vi.mocked(validateDistanceFunction);

/** Renders the current field-error keys so a test can assert what was published. */
function FieldErrorKeysProbe() {
  const errors = useFieldErrors();
  return <div data-testid="field-error-keys">{[...errors.keys()].join(',')}</div>;
}

describe('DistanceFunctionInput', () => {
  beforeEach(() => {
    mockValidate.mockReset();
  });

  it('renders the editor with the given value', async () => {
    mockValidate.mockResolvedValue({ valid: true, error: null, from: 0, to: 0 });
    render(<DistanceFunctionInput value="math.exp({distance})*{value}" onChange={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText(/math\.exp/)).toBeInTheDocument();
    });
  });

  it('calls the endpoint (debounced) with the function and declared parameters', async () => {
    mockValidate.mockResolvedValue({ valid: true, error: null, from: 0, to: 0 });
    render(
      <DistanceFunctionInput
        value="math.exp({distance}*{c})*{value}"
        declaredParameters={['c']}
        onChange={() => {}}
      />
    );
    await waitFor(() => {
      expect(mockValidate).toHaveBeenCalledWith(
        expect.objectContaining({
          function: 'math.exp({distance}*{c})*{value}',
          parameters: ['c'],
        })
      );
    });
  });

  it('outlines the input in red and shows the endpoint error when invalid', async () => {
    mockValidate.mockResolvedValue({
      valid: false,
      error: "Distance function contains disallowed name: 'a'.",
      from: 0,
      to: 1,
    });
    render(<DistanceFunctionInput value="a + b" onChange={() => {}} />);
    await waitFor(() => {
      const control = screen.getByTestId('scan-config-control');
      expect(control.className).toContain('border-red-500');
      expect(control.getAttribute('aria-invalid')).toBe('true');
      expect(screen.getByRole('alert')).toHaveTextContent(/disallowed name/);
    });
  });

  it('does not outline in red for a valid value', async () => {
    mockValidate.mockResolvedValue({ valid: true, error: null, from: 0, to: 0 });
    render(<DistanceFunctionInput value="{value} + {distance}" onChange={() => {}} />);
    await waitFor(() => {
      expect(mockValidate).toHaveBeenCalled();
    });
    const control = screen.getByTestId('scan-config-control');
    expect(control.className).not.toContain('border-red-500');
    expect(control.getAttribute('aria-invalid')).toBe('false');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('publishes a field error at errorPath when the endpoint reports invalid', async () => {
    mockValidate.mockResolvedValue({
      valid: false,
      error: 'bad',
      from: 0,
      to: 1,
    });
    const path = 'distance_dependent_distributions/mouse_decay/function';
    render(
      <>
        <DistanceFunctionInput value="a + b" onChange={() => {}} errorPath={path} />
        <FieldErrorKeysProbe />
      </>
    );
    await waitFor(() => {
      expect(screen.getByTestId('field-error-keys')).toHaveTextContent(path);
    });
  });

  it('does not call the endpoint for an empty value', async () => {
    render(<DistanceFunctionInput value="" onChange={() => {}} />);
    // Give the debounce time to (not) fire.
    await new Promise((r) => setTimeout(r, 500));
    expect(mockValidate).not.toHaveBeenCalled();
  });

  // The dispatcher keys this component by dictionary entry, so switching entries remounts a fresh
  // editor instead of reusing one instance. A fresh instance has its own undo history, which is
  // what prevents undo in one entry from leaking a previous entry's text into the current one.
  it('mounts a fresh editor (no leaked content) when the entry key changes', async () => {
    mockValidate.mockResolvedValue({ valid: true, error: null, from: 0, to: 0 });
    const onChange = vi.fn();
    const { rerender } = render(
      <DistanceFunctionInput key="mouse_decay" value="math.exp({distance})" onChange={onChange} />
    );
    await waitFor(() => {
      expect(screen.getByText(/math\.exp/)).toBeInTheDocument();
    });

    rerender(<DistanceFunctionInput key="rat_decay" value="{value}*2" onChange={onChange} />);
    await waitFor(() => {
      expect(screen.getByText(/\{value\}/)).toBeInTheDocument();
    });
    // The previous entry's function is gone, and the remount did not echo a value back via onChange.
    expect(screen.queryByText(/math\.exp/)).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });
});
