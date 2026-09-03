import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import { CampaignStatusBadgePopover } from '@/features/data-grid/bindings/entitycore/renderers/campaign-status-cell';

import type { ReactNode } from 'react';

function withQuery(ui: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const map = (entries: Array<[ActivityStatus, number]>) => new Map(entries);

describe('CampaignStatusBadgePopover fetcher injection', () => {
  it('renders the injected SYNC statusCountMap without calling any fetcher', async () => {
    const fetchStatus = vi.fn();
    const { container } = withQuery(
      <CampaignStatusBadgePopover
        statusCountMap={map([[ActivityStatus.DONE, 3]])}
        fetchStatus={fetchStatus}
      />
    );

    await waitFor(() => expect(container.textContent).toContain('Done'));
    expect(container.textContent).toContain('×3');
    // a provided map wins → the async fetcher is never invoked
    expect(fetchStatus).not.toHaveBeenCalled();
  });

  it('polls the injected ASYNC fetchStatus and renders the resolved headline', async () => {
    const fetchStatus = vi.fn(() => Promise.resolve(map([[ActivityStatus.RUNNING, 1]])));
    const { container } = withQuery(
      <CampaignStatusBadgePopover fetchStatus={fetchStatus} statusQueryKey={['async-status']} />
    );

    await waitFor(() => expect(container.textContent).toContain('Running'));
    expect(fetchStatus).toHaveBeenCalled();
  });

  it('renders a plain badge (no hover popover) when no scan fetcher is injected', async () => {
    const { container } = withQuery(
      <CampaignStatusBadgePopover statusCountMap={map([[ActivityStatus.DONE, 1]])} />
    );

    await waitFor(() => expect(container.textContent).toContain('Done'));
    expect(container.querySelector('button[type="button"]')).toBeNull();
  });

  it('shows per-status counts for a mixed campaign', async () => {
    const { container } = withQuery(
      <CampaignStatusBadgePopover
        statusCountMap={map([
          [ActivityStatus.DONE, 2],
          [ActivityStatus.CREATED, 4],
        ])}
      />
    );

    await waitFor(() =>
      expect(container.querySelector('[aria-label="4 Generated, 2 Done"]')).not.toBeNull()
    );
    // labels are dropped once several statuses are present
    expect(container.textContent).not.toContain('Generated');
    expect(container.textContent).not.toContain('Done');
    expect(container.textContent).toContain('4');
    expect(container.textContent).toContain('2');
  });

  it('collapses a crowded breakdown to an ellipsis', async () => {
    const { container } = withQuery(
      <CampaignStatusBadgePopover
        statusCountMap={map([
          [ActivityStatus.CREATED, 2],
          [ActivityStatus.PENDING, 1],
          [ActivityStatus.RUNNING, 1],
          [ActivityStatus.DONE, 4],
          [ActivityStatus.ERROR, 1],
        ])}
      />
    );

    const pill = await waitFor(() => {
      const found = container.querySelector('[data-slot="badge"]');
      expect(found).not.toBeNull();
      return found as HTMLElement;
    });
    expect(pill.textContent).toContain('…');
    expect(pill.children).toHaveLength(4);
    // hidden buckets stay in the label
    expect(pill.getAttribute('aria-label')).toBe(
      '2 Generated, 1 Pending, 1 Running, 4 Done, 1 Error'
    );
  });

  it('wires a hover popover trigger when a scan fetcher is injected', async () => {
    const fetchScanRows = vi.fn(() => Promise.resolve([]));
    const { container } = withQuery(
      <CampaignStatusBadgePopover
        statusCountMap={map([[ActivityStatus.DONE, 1]])}
        fetchScanRows={fetchScanRows}
        title="Sim One execution status"
      />
    );

    await waitFor(() => expect(container.textContent).toContain('Done'));
    expect(container.querySelector('button[type="button"]')).not.toBeNull();
    // …but scan rows are fetched lazily (only on open), so nothing is requested yet
    expect(fetchScanRows).not.toHaveBeenCalled();
  });
});
