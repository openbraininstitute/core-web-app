import { act, render, renderHook, screen } from '@testing-library/react';
import { Profiler, useState } from 'react';
import { describe, expect, it } from 'vitest';

import { createScanConfigStore } from '@/features/scan-config/store';
import {
  ScanConfigErrorsProvider,
  ScanConfigStoreProvider,
  useHasIssues,
  useReportedIssues,
  useReportIssue,
} from '@/features/scan-config/use-config-store';

import type { ReactNode } from 'react';
import type { Config, ConfigSchema } from '@/features/scan-config/types';

const schema = {
  type: 'object',
  properties: {
    info: { type: 'object', properties: { campaign_name: { type: 'string', minLength: 1 } } },
    neuron_sets: {
      type: 'object',
      additionalProperties: { type: 'object', properties: { ids: { type: 'array' } } },
    },
  },
} as unknown as ConfigSchema;

function config(): Config {
  return {
    info: { campaign_name: 'name' },
    neuron_sets: { 'Neuron set 1': { ids: [1] }, 'Neuron set 10': { ids: 'not a list' } },
  };
}

function Reporter({ path, message }: { path: string | undefined; message: string | undefined }) {
  useReportIssue(path, message);
  return null;
}

function Flag({ path }: { path: string }) {
  return <span data-testid={`flag:${path}`}>{String(useHasIssues(path))}</span>;
}

function Reported() {
  const issues = useReportedIssues();
  return (
    <span data-testid="reported">
      {[...issues].map(([path, message]) => `${path}=${message}`).join(';')}
    </span>
  );
}

function Providers({ initial = config(), children }: { initial?: Config; children: ReactNode }) {
  const [store] = useState(() => createScanConfigStore(initial));
  return (
    <ScanConfigStoreProvider store={store}>
      <ScanConfigErrorsProvider schema={schema}>{children}</ScanConfigErrorsProvider>
    </ScanConfigStoreProvider>
  );
}

const flag = (path: string) => screen.getByTestId(`flag:${path}`).textContent;

describe('useHasIssues', () => {
  it('is true for a schema error at or below the path, and for the whole form', () => {
    render(
      <Providers>
        <Flag path="/neuron_sets/Neuron set 10" />
        <Flag path="/neuron_sets" />
        <Flag path="" />
        <Flag path="/info" />
      </Providers>
    );

    expect(flag('/neuron_sets/Neuron set 10')).toBe('true');
    expect(flag('/neuron_sets')).toBe('true');
    expect(flag('')).toBe('true');
    expect(flag('/info')).toBe('false');
  });

  it('is false for a sibling whose name only starts the same', () => {
    render(
      <Providers>
        <Flag path="/neuron_sets/Neuron set 1" />
        <Reporter path="/info_extra/field" message="broken" />
        <Flag path="/info" />
      </Providers>
    );

    expect(flag('/neuron_sets/Neuron set 1')).toBe('false');
    expect(flag('/info')).toBe('false');
  });

  it('is true for a reported issue at or below the path', () => {
    render(
      <Providers>
        <Reporter path="/info/campaign_name" message="taken" />
        <Flag path="/info" />
        <Flag path="/info/campaign_name" />
      </Providers>
    );

    expect(flag('/info')).toBe('true');
    expect(flag('/info/campaign_name')).toBe('true');
  });

  it('does not re-render while issues change under another path', () => {
    const store = createScanConfigStore(config());
    const commits = { count: 0 };
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ScanConfigStoreProvider store={store}>
        <ScanConfigErrorsProvider schema={schema}>
          <Profiler
            id="reader"
            onRender={() => {
              commits.count += 1;
            }}
          >
            {children}
          </Profiler>
        </ScanConfigErrorsProvider>
      </ScanConfigStoreProvider>
    );
    const { result } = renderHook(() => useHasIssues('/info'), { wrapper });
    const before = commits.count;

    act(() =>
      store.set((previous) => ({ ...previous, neuron_sets: { 'Neuron set 1': { ids: 'bad' } } }))
    );

    expect(result.current).toBe(false);
    expect(commits.count).toBe(before);
  });
});

describe('useReportIssue', () => {
  it('reports an issue, updates its message and clears it when the message goes', () => {
    const { rerender } = render(
      <Providers>
        <Reporter path="/info/campaign_name" message="taken" />
        <Reported />
      </Providers>
    );
    expect(screen.getByTestId('reported')).toHaveTextContent('/info/campaign_name=taken');

    rerender(
      <Providers>
        <Reporter path="/info/campaign_name" message="too long" />
        <Reported />
      </Providers>
    );
    expect(screen.getByTestId('reported')).toHaveTextContent('/info/campaign_name=too long');

    rerender(
      <Providers>
        <Reporter path="/info/campaign_name" message={undefined} />
        <Reported />
      </Providers>
    );
    expect(screen.getByTestId('reported')).toBeEmptyDOMElement();
  });

  it('clears the issue when the reporter unmounts', () => {
    const valid = { info: { campaign_name: 'name' }, neuron_sets: {} };
    const { rerender } = render(
      <Providers initial={valid}>
        <Reporter path="/info/campaign_name" message="taken" />
        <Flag path="" />
      </Providers>
    );
    expect(flag('')).toBe('true');

    rerender(
      <Providers initial={valid}>
        <Flag path="" />
      </Providers>
    );

    expect(flag('')).toBe('false');
  });

  it('reads a path without a leading slash as the same path', () => {
    render(
      <Providers>
        <Reporter path="info/campaign_name" message="taken" />
        <Flag path="/info" />
        <Reported />
      </Providers>
    );

    expect(flag('/info')).toBe('true');
    expect(screen.getByTestId('reported')).toHaveTextContent('/info/campaign_name=taken');
  });

  it('reports nothing without a path', () => {
    render(
      <Providers>
        <Reporter path={undefined} message="taken" />
        <Reported />
      </Providers>
    );

    expect(screen.getByTestId('reported')).toBeEmptyDOMElement();
  });
});
