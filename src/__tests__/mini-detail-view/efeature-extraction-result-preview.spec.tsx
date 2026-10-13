import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EFeatureExtractionCampaign } from '@/entity-configuration/domain/extraction/efeature-extraction-campaign';
import { resolveEFeatureExtractionCampaignId } from '@/entity-configuration/domain/simulation/efeature-extraction-result';
import { EFeatureExtractionResultPreview } from '@/ui/segments/mini-detail-view/previews/efeature-extraction-result-preview';

import type { ITaskResult } from '@/api/entitycore/types/entities/task-result';

vi.mock('@/ui/hooks/use-workspace', () => ({
  useWorkspace: () => ({ virtualLabId: 'vl-1', projectId: 'proj-1' }),
}));

vi.mock('@/entity-configuration/domain/simulation/efeature-extraction-result', () => ({
  resolveEFeatureExtractionCampaignId: vi.fn(),
}));

const record = { id: 'result-1', name: 'Result' } as unknown as ITaskResult;

function renderPreview() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <EFeatureExtractionResultPreview record={record} />
    </QueryClientProvider>
  );
}

describe('EFeatureExtractionResultPreview', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists the protocols, amplitudes and features the extraction selected', async () => {
    vi.mocked(resolveEFeatureExtractionCampaignId).mockResolvedValue('campaign-1');
    vi.spyOn(EFeatureExtractionCampaign.api.query, 'resolve').mockResolvedValue({
      config: {
        form: {
          // nested the way a scan-config block holds it
          initialize: {
            efeatures: {
              type: 'SelectEFeaturesByProtocol',
              protocols: [
                {
                  type: 'IDRestProtocol',
                  extraction_amplitudes: [
                    [0.2, false],
                    [0.3, true],
                  ],
                  features: [{ type: 'VoltageBaseFeature' }],
                },
              ],
              extra_features_by_protocol: { IDRestProtocol: [{ type: 'ISICVFeature' }] },
            },
          },
        },
      },
    } as never);

    renderPreview();

    expect(await screen.findByText('IDRest')).toBeInTheDocument();
    expect(screen.getByText('Voltage base')).toBeInTheDocument();
    expect(screen.getByText('ISICV')).toBeInTheDocument();
    expect(screen.getByText('0.2')).toBeInTheDocument();
    expect(screen.getByText(/validation/)).toBeInTheDocument();
  });

  it('says so when the result cannot be traced to a campaign', async () => {
    vi.mocked(resolveEFeatureExtractionCampaignId).mockResolvedValue(null);

    renderPreview();

    expect(
      await screen.findByText('No e-feature selection found for this result.')
    ).toBeInTheDocument();
  });
});
