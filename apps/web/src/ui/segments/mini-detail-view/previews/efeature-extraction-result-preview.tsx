'use client';

import { useQuery } from '@tanstack/react-query';
import { Empty } from 'antd';
import { useMemo } from 'react';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import { getTaskResult } from '@/api/entitycore/queries/task';
import { getAsset } from '@/api/entitycore/selectors/assets';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { Align } from '@/features/data-grid/core';
import { SimpleGrid } from '@/features/data-grid/presets/simple-grid';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Skeleton } from '@/ui/molecules/skeleton';

import type { ITaskResult } from '@/api/entitycore/types/entities/task-result';
import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';

/**
 * The `extracted_features.json` asset BluePyEModel writes: the fitness-calculator configuration,
 * each e-feature carries its target `mean` and `original_std` under a `protocol_name`, and each
 * protocol its stimulus.
 */
type ExtractedFeatures = {
  efeatures: {
    efel_feature_name: string;
    protocol_name: string;
    recording_name?: string;
    mean?: number | null;
    original_std?: number | null;
  }[];
  protocols: {
    name: string;
    validation?: boolean;
    // the field set varies by protocol type (e.g. a threshold-based protocol's `amp`/
    // `thresh_perc`/`delay`/`duration`/`holding_current` vs. others' own fields), so it is read
    // generically rather than as a fixed shape.
    stimuli?: Record<string, number | null>[];
  }[];
};

type FeatureRow = {
  name: string;
  recording: string | null;
  mean: number | null;
  std: number | null;
};

type ProtocolGroup = {
  name: string;
  validation: boolean;
  /** amplitude as a percentage of the cell's threshold current, when the protocol is threshold-based */
  threshPerc: number | null;
  /** absolute injected amplitude (nA), when set */
  amp: number | null;
  features: FeatureRow[];
};

type ProtocolRow = {
  /** unique across the table: a protocol with several stimuli produces several rows */
  id: string;
  protocol: string;
  validation: boolean;
  /** the raw stimulus fields (field set varies by protocol type); null when there's none */
  stimulus: Record<string, number | null> | null;
};

/** Round to a few significant figures without trailing-zero noise. */
function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  if (value === 0) return '0';
  const abs = Math.abs(value);
  // very small or very large: scientific; otherwise up to 4 significant digits
  const text = abs < 1e-3 || abs >= 1e5 ? value.toExponential(2) : value.toPrecision(4);
  return Number.parseFloat(text).toString();
}

/**
 * The protocols a result's features were extracted under, one row per stimulus (a protocol with
 * several stimuli gets several rows; one with none still gets a row, with no stimulus fields).
 */
function summarizeProtocols(protocols: ExtractedFeatures['protocols']): ProtocolRow[] {
  let rowIndex = 0;
  return protocols.flatMap((protocol): ProtocolRow[] => {
    const validation = protocol.validation ?? false;
    const stimuli = protocol.stimuli ?? [];
    const toRow = (stimulus: Record<string, number | null> | null) => ({
      id: `${protocol.name}-${rowIndex++}`,
      protocol: protocol.name,
      validation,
      stimulus,
    });
    return stimuli.length > 0 ? stimuli.map(toRow) : [toRow(null)];
  });
}

/** Every stimulus field seen across all rows, in first-seen order - the table's dynamic columns. */
function stimulusColumns(rows: ProtocolRow[]): string[] {
  const columns: string[] = [];
  for (const row of rows) {
    for (const key of Object.keys(row.stimulus ?? {})) {
      if (!columns.includes(key)) columns.push(key);
    }
  }
  return columns;
}

/** `holding_current` -> "Holding current"; a key with no separators is just capitalized. */
function humanizeKey(key: string): string {
  const label = key.replace(/_/g, ' ');
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Group the extracted e-features by protocol, keeping each feature's target value. */
function groupByProtocol({ efeatures, protocols }: ExtractedFeatures): ProtocolGroup[] {
  const rowsByProtocol = new Map<string, FeatureRow[]>();
  for (const feature of efeatures) {
    const rows = rowsByProtocol.get(feature.protocol_name) ?? [];
    rows.push({
      name: feature.efel_feature_name,
      recording: feature.recording_name ?? null,
      mean: feature.mean ?? null,
      std: feature.original_std ?? null,
    });
    rowsByProtocol.set(feature.protocol_name, rows);
  }
  // keep the file's protocol order, then any protocol only seen on the features
  const names = [...protocols.map((p) => p.name), ...rowsByProtocol.keys()].filter(
    (name, index, all) => all.indexOf(name) === index
  );
  return names
    .filter((name) => rowsByProtocol.has(name))
    .map((name) => {
      const protocol = protocols.find((p) => p.name === name);
      const stimulus = protocol?.stimuli?.[0];
      return {
        name,
        validation: protocol?.validation ?? false,
        threshPerc: stimulus?.thresh_perc ?? null,
        amp: stimulus?.amp ?? null,
        features: rowsByProtocol.get(name) ?? [],
      };
    });
}

const FEATURE_COLUMNS: ISimpleColumn<FeatureRow>[] = [
  {
    id: 'feature',
    header: 'Feature',
    renderCell: (row) => (
      <span className="text-primary-9">
        {row.name}
        {row.recording && row.recording !== 'soma.v' && (
          <span className="text-gray-400"> · {row.recording}</span>
        )}
      </span>
    ),
  },
  {
    id: 'mean',
    header: 'Mean',
    align: Align.Right,
    renderCell: (row) => (
      <span className="tabular-nums text-gray-700">{formatNumber(row.mean)}</span>
    ),
  },
  {
    id: 'std',
    header: 'Std',
    align: Align.Right,
    renderCell: (row) => (
      <span className="tabular-nums text-gray-500">{formatNumber(row.std)}</span>
    ),
  },
];

/** Read-only view of the target e-features a result holds, grouped by their protocol. */
export function EFeatureExtractionResultPreview({ record }: { record: ITaskResult }) {
  const context = useWorkspace();
  const { data, isLoading, error } = useQuery({
    queryKey: ['efeature-extraction-features', context, record.id],
    queryFn: async () => {
      // a list row may arrive without its assets; fetch the full result when so
      const assets =
        record.assets ?? (await getTaskResult({ id: record.id, context })).assets ?? [];
      const asset = getAsset({
        assets,
        label: AssetLabel.efeature_extraction_features,
      }).getOneOrNull();
      if (!asset) return null;

      const response = await downloadAsset({
        entityId: record.id,
        entityType: EntityTypeDict.TaskResult,
        id: asset.id,
        ctx: context,
        asRawResponse: true,
      });
      const features = (await response.json()) as ExtractedFeatures;
      return {
        groups: groupByProtocol(features),
        protocols: summarizeProtocols(features.protocols),
      };
    },
  });
  const groups = data?.groups;
  const protocols = data?.protocols;
  const stimulusCols = useMemo(() => (protocols ? stimulusColumns(protocols) : []), [protocols]);
  const protocolColumns = useMemo<ISimpleColumn<ProtocolRow>[]>(
    () => [
      {
        id: 'protocol',
        header: 'Protocol',
        renderCell: (row) => (
          <span className="text-primary-9">
            {row.protocol}
            {row.validation && <span className="font-light text-gray-500"> · validation</span>}
          </span>
        ),
      },
      ...stimulusCols.map((key) => ({
        id: key,
        header: humanizeKey(key),
        align: Align.Right,
        renderCell: (row: ProtocolRow) => (
          <span className="tabular-nums text-gray-700">
            {formatNumber(row.stimulus?.[key] ?? null)}
          </span>
        ),
      })),
    ],
    [stimulusCols]
  );

  if (isLoading) {
    return (
      <div className="mt-5 flex flex-col gap-2">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    );
  }

  if (!groups?.length) {
    return (
      <Empty
        className="mt-5"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          error
            ? 'Could not load the e-features for this result.'
            : 'No e-features found for this result.'
        }
      />
    );
  }

  return (
    <div className="mt-5 flex flex-col gap-3" data-testid="efeature-selection-preview">
      <div className="text-label text-base font-light">E-features by protocol</div>
      <ul className="flex flex-col gap-3">
        {groups.map((protocol) => (
          <li
            key={protocol.name}
            className="border-neutral-2 overflow-hidden rounded-lg border bg-white"
          >
            <div className="border-neutral-2 flex items-baseline justify-between gap-3 border-b px-3 py-2">
              <span className="text-primary-9 font-bold">
                {protocol.name}
                {protocol.validation && (
                  <span className="font-light text-gray-500"> · validation</span>
                )}
              </span>
              {protocol.threshPerc !== null ? (
                <span className="text-xs text-gray-500">
                  {formatNumber(protocol.threshPerc)}% of threshold
                </span>
              ) : (
                protocol.amp !== null && (
                  <span className="text-xs text-gray-500">{formatNumber(protocol.amp)} nA</span>
                )
              )}
            </div>

            <SimpleGrid<FeatureRow>
              columns={FEATURE_COLUMNS}
              rows={protocol.features}
              getRowId={(row) => row.name}
            />
          </li>
        ))}
      </ul>

      {protocols && protocols.length > 0 && (
        <>
          <div className="text-label mt-2 text-base font-light">Stimulation protocols</div>
          <div className="border-neutral-2 overflow-hidden rounded-lg border bg-white">
            <SimpleGrid<ProtocolRow>
              columns={protocolColumns}
              rows={protocols}
              getRowId={(row) => row.id}
            />
          </div>
        </>
      )}
    </div>
  );
}
