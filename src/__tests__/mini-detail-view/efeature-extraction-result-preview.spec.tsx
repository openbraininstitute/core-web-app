import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { EFeatureExtractionResultPreview } from '@/ui/segments/mini-detail-view/previews/efeature-extraction-result-preview';

import type { ITaskResult } from '@/api/entitycore/types/entities/task-result';

vi.mock('@/ui/hooks/use-workspace', () => ({
  useWorkspace: () => ({ virtualLabId: 'vl-1', projectId: 'proj-1' }),
}));

vi.mock('@/api/entitycore/queries/assets', () => ({
  downloadAsset: vi.fn(),
}));

const record = {
  id: 'result-1',
  name: 'Result',
  assets: [{ id: 'asset-1', label: AssetLabel.efeature_extraction_features }],
} as unknown as ITaskResult;

function renderPreview() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <EFeatureExtractionResultPreview record={record} />
    </QueryClientProvider>
  );
}

describe('EFeatureExtractionResultPreview', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists the protocols and features from the result asset', async () => {
    vi.mocked(downloadAsset).mockResolvedValue({
      json: async () => ({
        efeatures: [
          {
            efel_feature_name: 'voltage_base',
            protocol_name: 'Step_140',
            recording_name: 'soma.v',
            mean: -85.6522,
            original_std: 1.8532,
          },
          {
            efel_feature_name: 'ohmic_input_resistance_vb_ssse',
            protocol_name: 'RinProtocol',
            recording_name: 'soma.v',
            mean: 110.4961,
            original_std: 60.9419,
          },
        ],
        protocols: [
          { name: 'Step_140', validation: false, stimuli: [{ thresh_perc: 140.6698 }] },
          { name: 'RinProtocol', validation: true, stimuli: [{ amp: -0.02 }] },
        ],
      }),
    } as never);

    renderPreview();

    expect(await screen.findByText('Step_140')).toBeInTheDocument();
    expect(screen.getByText('voltage_base')).toBeInTheDocument();
    expect(screen.getByText('ohmic_input_resistance_vb_ssse')).toBeInTheDocument();
    // the target value and its spread are rendered
    expect(screen.getByText('-85.65')).toBeInTheDocument();
    expect(screen.getByText('1.853')).toBeInTheDocument();
    expect(screen.getByText('110.5')).toBeInTheDocument();
    expect(screen.getByText(/validation/)).toBeInTheDocument();
  });

  it('says so when the result has no extracted-features asset', async () => {
    const bare = { id: 'result-2', name: 'Result', assets: [] } as unknown as ITaskResult;
    render(
      <QueryClientProvider client={new QueryClient()}>
        <EFeatureExtractionResultPreview record={bare} />
      </QueryClientProvider>
    );

    expect(await screen.findByText('No e-features found for this result.')).toBeInTheDocument();
  });
});
