import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { getSimulatableExtracellularRecordingArray } from '@/api/entitycore/queries/model/simulatable-extracellular-recording-array';
import {
  buildLfpSummaryRequest,
  getLfpSummaryIndex,
  requestLfpSummary,
} from '@/api/small-scale-simulator/simulation-result/lfp-summary';
import { contactPositions } from '@/features/lfp-viewer/contacts';
import {
  datasetOf,
  lfpSummaryIndexSchema,
  overviewLevel,
  readContacts,
  readField,
  readSlice,
} from '@/features/lfp-viewer/summary';
import {
  downloadElectrodeLocations,
  findElectrodeLocationsAsset,
} from '@/features/scan-config/components/model-preview/electrode-locations-asset';

import type { LfpSummaryStatus } from '@/api/small-scale-simulator/simulation-result/lfp-summary';
import type { LfpField, LfpSummaryIndex } from '@/features/lfp-viewer/summary';
import type { WorkspaceContext } from '@/types/common';

/** How often a summary being built is asked after. */
const BUILDING_POLL_MS = 5000;

export type LfpSummary = {
  sha256: string;
  index: LfpSummaryIndex;
  /** The total field at its overview level: what the map, the 3D contacts and the traces draw. */
  total: LfpField;
  /** Per contact, the index's `stats` columns. */
  stats: Float32Array;
  /** Per contact, the power at each of the index's `psd_frequencies`, in µV²/Hz. */
  psd: Float32Array;
};

/**
 * An LFP report's summary from Bluenaas, which builds it the first time it is
 * asked: its status, asked again while it builds, then, once ready, its index
 * and the total's overview, stats and spectra.
 */
export function useLfpSummary({
  ctx,
  resultId,
  assetId,
}: {
  ctx: WorkspaceContext | null;
  resultId: string;
  assetId: string;
}) {
  const of = { ctx, resultId, assetId };
  const status = useQuery<LfpSummaryStatus>({
    queryKey: ['lfp-summary', 'status', resultId, assetId],
    queryFn: () => requestLfpSummary(of),
    refetchInterval: (query) => (query.state.data?.state === 'building' ? BUILDING_POLL_MS : false),
    staleTime: Infinity,
  });
  const ready = status.data?.state === 'ready' ? status.data : null;

  const summary = useQuery<LfpSummary>({
    queryKey: ['lfp-summary', 'data', resultId, assetId, ready?.sha256],
    enabled: ready !== null,
    staleTime: Infinity,
    gcTime: 5 * 60_000,
    queryFn: async ({ signal }) => {
      const sha256 = ready?.sha256 ?? '';
      const index = lfpSummaryIndexSchema.parse(await getLfpSummaryIndex(of));
      const request = await buildLfpSummaryRequest(of);
      const axis = index.axes[0];
      const [total, stats, psd] = await Promise.all([
        readField(request, index, axis, 0, overviewLevel(axis), signal),
        readSlice(request, datasetOf(index, axis.stats), [0], 1, signal),
        readSlice(request, datasetOf(index, axis.psd), [0], 1, signal),
      ]);
      return { sha256, index, total, stats: stats as Float32Array, psd: psd as Float32Array };
    },
  });

  return { status, summary };
}

/**
 * The traced contacts at full resolution, where the overview is coarser: their
 * own rows of the total, read by range as the contacts traced change.
 */
export function useTraceField({
  ctx,
  resultId,
  assetId,
  summary,
  traces,
}: {
  ctx: WorkspaceContext | null;
  resultId: string;
  assetId: string;
  summary: LfpSummary;
  traces: readonly number[];
}) {
  const { index, total } = summary;
  return useQuery({
    queryKey: ['lfp-summary', 'traces', resultId, assetId, summary.sha256, traces.join(',')],
    enabled: total.kind !== 'value' && traces.length > 0,
    staleTime: Infinity,
    gcTime: 60_000,
    placeholderData: keepPreviousData,
    queryFn: async ({ signal }) => {
      const request = await buildLfpSummaryRequest({ ctx, resultId, assetId });
      return readContacts(request, index, index.axes[0], 0, traces, signal);
    },
  });
}

/**
 * Where the report's contacts are, from its recording array's stored
 * locations, in the report's order. Null where the array has none, or they do
 * not match the report.
 */
export function useContactPositions({
  ctx,
  arrayId,
  contacts,
}: {
  ctx: WorkspaceContext | null;
  arrayId: string | null;
  contacts: number | undefined;
}) {
  return useQuery({
    queryKey: ['lfp-summary', 'contacts', arrayId, contacts],
    enabled: arrayId !== null && contacts !== undefined && ctx !== null,
    staleTime: Infinity,
    queryFn: async () => {
      if (!arrayId || !ctx || contacts === undefined) return null;
      const array = await getSimulatableExtracellularRecordingArray({ id: arrayId, context: ctx });
      const asset = findElectrodeLocationsAsset(array.assets);
      if (!asset) return null;
      const locations = await downloadElectrodeLocations({
        ctx,
        entityId: arrayId,
        assetId: asset.id,
      });
      return contactPositions(locations, contacts);
    },
  });
}
