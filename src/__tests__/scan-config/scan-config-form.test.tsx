import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createPortal } from 'react-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const generateScanConfigCampaign = vi.fn();

vi.mock('@/api/one/scan-config', () => ({
  generateScanConfigCampaign: (...args: unknown[]) => generateScanConfigCampaign(...args),
}));
vi.mock('@/ui/hooks/use-workspace', () => ({
  useWorkspace: () => ({ virtualLabId: 'lab', projectId: 'project' }),
}));

import GenerateConfigButton from '@/features/scan-config/components/generate-config-button';
import { ScanConfigForm } from '@/features/scan-config/components/scan-config-form';
import { createScanConfigStore } from '@/features/scan-config/store';
import { ScanConfigActivity } from '@/features/scan-config/types';
import {
  ScanConfigErrorsProvider,
  ScanConfigStoreProvider,
} from '@/features/scan-config/use-config-store';

import type { ReactNode } from 'react';
import type { Config, ConfigSchema } from '@/features/scan-config/types';

const SCHEMA = {
  type: 'object',
  properties: {
    info: { type: 'object', properties: { campaign_name: { type: 'string', minLength: 1 } } },
  },
} as unknown as ConfigSchema;

function renderForm({
  config = { info: { campaign_name: 'name' } },
  campaignId = '',
  extra,
}: {
  config?: Config;
  campaignId?: string;
  extra?: ReactNode;
} = {}) {
  const store = createScanConfigStore(config);
  const setCampaignId = vi.fn();
  const setLoading = vi.fn();
  const setTab = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ScanConfigStoreProvider store={store}>
        <ScanConfigErrorsProvider schema={SCHEMA}>
          <ScanConfigForm
            loading={false}
            campaignId={campaignId}
            setCampaignId={setCampaignId}
            setLoading={setLoading}
            setTab={setTab}
            activity={ScanConfigActivity.Simulate}
            generatedApiUrl="/generate"
            entityType="circuit"
          >
            {extra}
            <input aria-label="Campaign name" />
            <textarea aria-label="Notes" />
            <GenerateConfigButton
              loading={false}
              campaignId={campaignId}
              activity={ScanConfigActivity.Simulate}
            />
          </ScanConfigForm>
        </ScanConfigErrorsProvider>
      </ScanConfigStoreProvider>
    </QueryClientProvider>
  );

  return { store, setCampaignId, setLoading, setTab };
}

const submitButton = () => screen.getByTestId('scan-config-submit') as HTMLButtonElement;

describe('ScanConfigForm', () => {
  beforeEach(() => {
    generateScanConfigCampaign.mockReset();
    generateScanConfigCampaign.mockResolvedValue('campaign-1');
  });

  it('is a form with a name, and Generate is its submit button', () => {
    renderForm();

    expect(screen.getByRole('form')).toHaveAccessibleName();
    expect(submitButton().type).toBe('submit');
    expect(submitButton().form).toBe(screen.getByRole('form'));
  });

  it('generates with the latest config when Generate is clicked', async () => {
    const { store, setCampaignId, setLoading } = renderForm();
    store.set({ info: { campaign_name: 'latest' } });

    fireEvent.click(submitButton());

    await waitFor(() => expect(setCampaignId).toHaveBeenCalledWith('campaign-1'));
    expect(generateScanConfigCampaign).toHaveBeenCalledTimes(1);
    expect(generateScanConfigCampaign.mock.calls[0]?.[0]).toMatchObject({
      config: { info: { campaign_name: 'latest' } },
      generatedApiUrl: '/generate',
    });
    expect(setLoading).toHaveBeenNthCalledWith(1, true);
    expect(setLoading).toHaveBeenLastCalledWith(false);
  });

  it('does not generate when Enter is pressed in a text input', () => {
    renderForm();
    const input = screen.getByLabelText('Campaign name');

    const notCancelled = fireEvent.keyDown(input, { key: 'Enter' });

    expect(notCancelled).toBe(false);
    expect(generateScanConfigCampaign).not.toHaveBeenCalled();
  });

  it('leaves Enter alone in an input of another form drawn through a portal', () => {
    function PortaledForm() {
      return createPortal(
        <form aria-label="Promotion code">
          <input aria-label="Code" />
        </form>,
        document.body
      );
    }
    renderForm({ extra: <PortaledForm /> });

    expect(fireEvent.keyDown(screen.getByLabelText('Code'), { key: 'Enter' })).toBe(true);
  });

  it('leaves Enter alone in a text area', () => {
    renderForm();

    expect(fireEvent.keyDown(screen.getByLabelText('Notes'), { key: 'Enter' })).toBe(true);
  });

  it('does not generate while the form has an issue', () => {
    renderForm({ config: { info: { campaign_name: '' } } });

    expect(submitButton()).toBeDisabled();
    fireEvent.submit(screen.getByRole('form'));

    expect(generateScanConfigCampaign).not.toHaveBeenCalled();
  });

  it('clears the campaign instead of generating when one exists', () => {
    const { setCampaignId } = renderForm({ campaignId: 'campaign-0' });

    fireEvent.click(submitButton());

    expect(setCampaignId).toHaveBeenCalledWith('');
    expect(generateScanConfigCampaign).not.toHaveBeenCalled();
  });
});
