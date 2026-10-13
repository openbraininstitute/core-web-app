'use client';

import { useQuery } from '@tanstack/react-query';
import { Empty } from 'antd';
import { isPlainObject } from 'es-toolkit/compat';

import { EFeatureExtractionCampaign } from '@/entity-configuration/domain/extraction/efeature-extraction-campaign';
import { resolveEFeatureExtractionCampaignId } from '@/entity-configuration/domain/simulation/efeature-extraction-result';
import {
  ecodeNameFromTypeName,
  humanizeTypeName,
  parseSelectionValue,
} from '@/features/scan-config/components/ui-elements/select-efeatures-by-protocol/helpers';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Skeleton } from '@/ui/molecules/skeleton';

import type { ITaskResult } from '@/api/entitycore/types/entities/task-result';
import type { ConfigValue } from '@/features/scan-config/types';

const SELECTION_TYPE = 'SelectEFeaturesByProtocol';

/** The `select_efeatures_by_protocol` value, wherever the extraction schema nests it in the form. */
function findSelection(value: unknown): ConfigValue | undefined {
  if (!isPlainObject(value)) return undefined;
  const record = value as Record<string, unknown>;
  if (record.type === SELECTION_TYPE) return record as ConfigValue;
  for (const child of Object.values(record)) {
    const found = findSelection(child);
    if (found) return found;
  }
  return undefined;
}

/** Read-only view of the protocols and e-features the extraction behind this result selected. */
export function EFeatureExtractionResultPreview({ record }: { record: ITaskResult }) {
  const context = useWorkspace();
  const { data: selection, isLoading } = useQuery({
    queryKey: ['efeature-extraction-selection', context, record.id],
    queryFn: async () => {
      const campaignId = await resolveEFeatureExtractionCampaignId(record.id, context);
      if (!campaignId) return null;
      // biome-ignore lint/style/noNonNullAssertion: resolve is defined on the campaign config
      const { config } = await EFeatureExtractionCampaign.api.query.resolve!({
        id: campaignId,
        context,
      });
      return parseSelectionValue(findSelection(config?.form));
    },
  });

  if (isLoading) {
    return (
      <div className="mt-5 flex flex-col gap-2">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    );
  }

  if (!selection?.protocols.length) {
    return (
      <Empty
        className="mt-5"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="No e-feature selection found for this result."
      />
    );
  }

  return (
    <div className="mt-5 flex flex-col gap-2" data-testid="efeature-selection-preview">
      <div className="text-label text-base font-light">E-features by protocol</div>
      <ul className="flex flex-col gap-2">
        {selection.protocols.map((protocol) => (
          <li
            key={protocol.type}
            className="border-neutral-2 rounded-lg border bg-white px-3 py-2.5"
          >
            <div className="text-primary-9 font-bold">{ecodeNameFromTypeName(protocol.type)}</div>

            {protocol.extraction_amplitudes.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {protocol.extraction_amplitudes.map(([amplitude, isValidation]) => (
                  <span
                    key={amplitude}
                    className="border-neutral-2 rounded-full border px-2 py-0.5 text-xs text-gray-700"
                  >
                    {amplitude}
                    {isValidation && <span className="text-gray-500"> · validation</span>}
                  </span>
                ))}
              </div>
            )}

            <ul className="mt-2 flex flex-wrap gap-1">
              {protocol.features.map((feature) => (
                <li
                  key={feature.type}
                  className="bg-primary-0 text-primary-9 rounded px-1.5 py-0.5 text-xs"
                >
                  {humanizeTypeName(feature.type, 'Feature')}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
