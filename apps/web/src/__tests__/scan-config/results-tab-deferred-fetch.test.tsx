import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { Activity, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

/**
 * The contract the scan-config template relies on: a results tab parked in a hidden
 * `<Activity>` runs no campaign query until it is opened, and keeps its state once closed again.
 * The `hidden` class it replaced gives neither — it mounts the effects and fetches straight away.
 */

const CAMPAIGN_QUERY_KEY = ['scan-config-results-probe'];

type TTab = 'configuration' | 'results';

function ResultsTab({ fetchCampaign }: { fetchCampaign: () => Promise<string> }) {
  const { data } = useQuery({ queryKey: CAMPAIGN_QUERY_KEY, queryFn: fetchCampaign });
  const [mountId] = useState(() => `mount-${Math.random()}`);

  return (
    <div data-testid="results" data-mount-id={mountId}>
      {data ?? 'loading'}
    </div>
  );
}

function Template({
  fetchCampaign,
  hideWith,
}: {
  fetchCampaign: () => Promise<string>;
  hideWith: 'activity' | 'class';
}) {
  const [tab, setTab] = useState<TTab>('configuration');
  const hidden = tab === 'configuration';
  const results = <ResultsTab fetchCampaign={fetchCampaign} />;

  return (
    <>
      <button type="button" onClick={() => setTab('results')}>
        results
      </button>
      <button type="button" onClick={() => setTab('configuration')}>
        configuration
      </button>
      {hideWith === 'activity' ? (
        <Activity mode={hidden ? 'hidden' : 'visible'}>{results}</Activity>
      ) : (
        <div style={hidden ? { display: 'none' } : undefined}>{results}</div>
      )}
    </>
  );
}

function renderTemplate(hideWith: 'activity' | 'class' = 'activity') {
  const fetchCampaign = vi.fn(() => Promise.resolve('campaign results'));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const view = render(
    <QueryClientProvider client={client}>
      <Template fetchCampaign={fetchCampaign} hideWith={hideWith} />
    </QueryClientProvider>
  );

  return { ...view, fetchCampaign };
}

const click = (name: string) => screen.getByRole('button', { name }).click();

/** Lets any effect that would fire on mount actually fire. */
const settle = () => act(async () => void (await new Promise((resolve) => setTimeout(resolve, 0))));

describe('results tab behind <Activity>', () => {
  it('runs no campaign query while the configuration tab is open', async () => {
    const { fetchCampaign } = renderTemplate();
    await settle();

    expect(screen.getByTestId('results')).not.toBeVisible();
    expect(fetchCampaign).not.toHaveBeenCalled();
  });

  it('is the difference from hiding with a class, which fetches immediately', async () => {
    const { fetchCampaign } = renderTemplate('class');
    await settle();

    expect(screen.getByTestId('results')).not.toBeVisible();
    expect(fetchCampaign).toHaveBeenCalledTimes(1);
  });

  it('fetches once the results tab is opened', async () => {
    const { fetchCampaign } = renderTemplate();

    click('results');

    await waitFor(() =>
      expect(screen.getByTestId('results')).toHaveTextContent('campaign results')
    );
    expect(fetchCampaign).toHaveBeenCalledTimes(1);
  });

  it('keeps the tab state when it is closed and reopened', async () => {
    renderTemplate();

    click('results');
    await waitFor(() => expect(screen.getByTestId('results')).toBeVisible());
    const mountId = screen.getByTestId('results').dataset.mountId;

    click('configuration');
    click('results');

    await waitFor(() => expect(screen.getByTestId('results')).toBeVisible());
    expect(screen.getByTestId('results').dataset.mountId).toBe(mountId);
  });
});
