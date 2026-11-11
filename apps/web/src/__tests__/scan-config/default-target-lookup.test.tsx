import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import {
  DefaultLookupProvider,
  usePublishDefaultLookup,
} from '@/features/scan-config/bridge/default-lookup-context';
import { DefaultTargetLookup } from '@/features/scan-config/components/ui-elements/default-target-lookup';

const PATH = 'target_efeatures/task_result';
const COPY = { title: 'Finding things', detail: 'from somewhere' };

function Publisher({ path = PATH, active = true }: { path?: string; active?: boolean }) {
  usePublishDefaultLookup(path, active ? COPY : null);
  return null;
}

function Field({ path = PATH, hasValue = false }: { path?: string; hasValue?: boolean }) {
  return (
    <DefaultTargetLookup fieldPath={path} hasValue={hasValue}>
      <input aria-label="picker" />
    </DefaultTargetLookup>
  );
}

describe('DefaultTargetLookup', () => {
  it('replaces the picker with a status pill while its path is looking up', () => {
    render(
      <DefaultLookupProvider>
        <Publisher />
        <Field />
      </DefaultLookupProvider>
    );

    expect(screen.getByRole('status')).toHaveTextContent('Finding things');
    expect(screen.getByRole('status')).toHaveTextContent('from somewhere');
    expect(screen.queryByLabelText('picker')).toBeNull();
  });

  it('keeps the picker when it has a value, for another path, and outside a provider', () => {
    const { rerender } = render(
      <DefaultLookupProvider>
        <Publisher />
        <Field hasValue />
      </DefaultLookupProvider>
    );
    expect(screen.getByLabelText('picker')).toBeInTheDocument();

    rerender(
      <DefaultLookupProvider>
        <Publisher />
        <Field path="optimize/other" />
      </DefaultLookupProvider>
    );
    expect(screen.getByLabelText('picker')).toBeInTheDocument();
    expect(screen.queryByRole('status')).toBeNull();

    rerender(<Field />);
    expect(screen.getByLabelText('picker')).toBeInTheDocument();
  });

  it('does not leak between two editors that use the same path', () => {
    render(
      <>
        <DefaultLookupProvider>
          <Publisher />
          <div data-testid="validate">
            <Field />
          </div>
        </DefaultLookupProvider>
        <DefaultLookupProvider>
          <div data-testid="optimize">
            <Field />
          </div>
        </DefaultLookupProvider>
      </>
    );

    expect(screen.getByTestId('validate')).toHaveTextContent('Finding things');
    expect(screen.getByTestId('optimize')).not.toHaveTextContent('Finding things');
    expect(screen.getByTestId('optimize').querySelector('input')).not.toBeNull();
  });

  it('removes the pill when the lookup ends or its publisher unmounts', () => {
    function Harness() {
      const [mounted, setMounted] = useState(true);
      return (
        <DefaultLookupProvider>
          {mounted ? <Publisher /> : null}
          <Field />
          <button type="button" onClick={() => setMounted(false)}>
            stop
          </button>
        </DefaultLookupProvider>
      );
    }
    render(<Harness />);
    expect(screen.getByRole('status')).toBeInTheDocument();

    fireEvent.click(screen.getByText('stop'));
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByLabelText('picker')).toBeInTheDocument();
  });
});
