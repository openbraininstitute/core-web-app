'use client';

import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { useCallback, useId, useMemo, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { getCircuit } from '@/api/entitycore/queries/model/circuit';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { withErrorConfig } from '@/components/GenericErrorFallback';
import { WorkspaceSection } from '@/constants';
import { resolveViewerFeaturesForEntityType } from '@/entity-configuration/domain/helpers';
import { ELECTRODE_FOCUSED_NEURON_OPACITY } from '@/features/scan-config/components/color-by/use-viewer-config';
import { usePlacedElectrodeOverlays } from '@/features/scan-config/components/model-preview/use-electrode-overlays';
import useWorkspace from '@/ui/hooks/use-workspace';
import { Checkbox } from '@/ui/molecules/checkbox';
import { Skeleton } from '@/ui/molecules/skeleton';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { cn } from '@/utils/css-class';

import type { ISimulatableExtracellularRecordingArray } from '@/api/entitycore/types/entities/simulatable-extracellular-recording-array';

// ModelPreview pulls in color-by (web worker + h5wasm) and morphoviewer, both of
// which must stay off the server bundle.
const ModelPreview = dynamic(
  () => import('@/features/scan-config/components/model-preview').then((m) => m.ModelPreview),
  { ssr: false }
);

/**
 * The recording array drawn in place: its parent circuit in 3D with the
 * electrode contacts overlaid, plus a list of the individual electrodes.
 *
 * The locations come from the array's stored `electrode_locations` asset rather
 * than a fresh call to Obi-One, so the view always shows the geometry this
 * entity was actually built with.
 *
 * Selecting an electrode in the list dims the others in the scene — the same
 * highlight path the scan-config form drives while an array is being built.
 */
export function ElectrodeArrayViewer({
  array,
}: {
  array: ISimulatableExtracellularRecordingArray;
}) {
  const context = useWorkspace();
  // Starts empty: the viewer opens on the bare circuit and the user ticks in the
  // electrodes they want to see.
  const [visibleIds, setVisibleIds] = useState<ReadonlySet<string>>(() => new Set());

  const toggleVisible = useCallback((id: string) => {
    setVisibleIds((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }, []);

  const { data: circuit, isLoading } = useQuery({
    queryKey: keyBuilder.oneCircuit({
      virtualLabId: context.virtualLabId,
      projectId: context.projectId,
      entityId: array.circuit_id ?? '',
    }),
    // biome-ignore lint/style/noNonNullAssertion: guarded by `enabled`
    queryFn: () => getCircuit({ id: array.circuit_id!, context }),
    enabled: !!array.circuit_id,
  });

  // Same hook the viewer uses; react-query dedupes the asset download, so this
  // only costs the overlay projection needed to label the list.
  const { overlays, isLoading: overlaysLoading } = usePlacedElectrodeOverlays({
    arrayEntity: array,
  });
  const electrodes = useMemo(() => summariseElectrodes(overlays), [overlays]);
  // Stable identity so CircuitPreview's overlay memo does not rerun per render.
  // No `onConfigChange`: this view is read-only, which is what keeps the overlays
  // static and hides the drag/rotate help.
  const electrodeOptions = useMemo(
    () => ({ arrayEntity: array, visibleIds: [...visibleIds] }),
    [array, visibleIds]
  );

  if (!array.circuit_id) return null;

  const features = resolveViewerFeaturesForEntityType(
    ExtendedEntitiesTypeDict.SimulatableExtracellularRecordingArray,
    { section: WorkspaceSection.Data }
  );

  return (
    <div className="flex h-[min(740px,75vh)] min-h-90 w-full gap-4">
      <ElectrodeList
        electrodes={electrodes}
        isLoading={overlaysLoading}
        visibleIds={visibleIds}
        onToggle={toggleVisible}
      />
      <div className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-neutral-2 bg-white text-primary-9">
        <ErrorBoundary
          FallbackComponent={withErrorConfig({
            cls: { container: 'bg-white' },
            showButtons: false,
            customError: 'Error while loading the electrode array viewer',
          })}
        >
          {isLoading || !circuit ? (
            <Skeleton className="flex h-full w-full items-center justify-center rounded-2xl" />
          ) : (
            <ModelPreview
              model={circuit}
              electrodeOverlaysEnabled
              viewerFeatures={features}
              defaultNeuronOpacity={ELECTRODE_FOCUSED_NEURON_OPACITY}
              electrodes={electrodeOptions}
            />
          )}
        </ErrorBoundary>
      </div>
    </div>
  );
}

interface ElectrodeSummary {
  id: string;
  name: string;
  color: string;
  contacts: number;
}

/**
 * Collapse the overlay groups into one row per electrode.
 *
 * Each block contributes up to two groups sharing an id — the contact cloud and
 * a pivot marker — so key by id and count contacts from the cloud only.
 */
function summariseElectrodes(
  overlays: ReturnType<typeof usePlacedElectrodeOverlays>['overlays']
): ElectrodeSummary[] {
  const byId = new Map<string, ElectrodeSummary>();
  for (const group of overlays) {
    const existing = byId.get(group.id);
    const contacts = group.kind === 'origin' ? 0 : group.coordinates.length / 3;
    if (existing) {
      existing.contacts += contacts;
      continue;
    }
    byId.set(group.id, { id: group.id, name: group.name, color: group.color, contacts });
  }
  return [...byId.values()];
}

function ElectrodeList({
  electrodes,
  isLoading,
  visibleIds,
  onToggle,
}: {
  electrodes: ElectrodeSummary[];
  isLoading: boolean;
  visibleIds: ReadonlySet<string>;
  onToggle: (id: string) => void;
}) {
  // Electrode ids are display names ("Electrode locations 0"), so pair each row
  // with the checkbox through a generated id rather than the name itself.
  const rowIdBase = useId();

  return (
    // `self-start` keeps the card as short as its content; `max-h-full` caps it at
    // the viewer's height, at which point the list below starts scrolling.
    <div className="flex max-h-full w-72 shrink-0 flex-col self-start overflow-hidden rounded-2xl border border-neutral-2 bg-white text-primary-9">
      <h2 className="shrink-0 border-b border-neutral-2 px-4 py-3 text-sm font-bold uppercase tracking-wide">
        Electrodes
      </h2>
      {isLoading && <Skeleton className="m-4" />}
      {!isLoading && electrodes.length === 0 && (
        <p className="px-4 py-3 text-sm text-neutral-4">
          This array has no stored electrode locations.
        </p>
      )}
      {/* no `flex-1`: the list keeps its natural height so a short list stays short,
          and `min-h-0` lets it shrink (and scroll) once `max-h-full` clamps the card */}
      <ul className="min-h-0 overflow-y-auto">
        {electrodes.map((electrode, index) => {
          const rowId = `${rowIdBase}-${index}`;
          const checked = visibleIds.has(electrode.id);
          return (
            <li key={electrode.id}>
              {/* label, not button: the row must stay clickable without nesting a
                  second control inside the checkbox's own button element */}
              <label
                htmlFor={rowId}
                className={cn(
                  'flex w-full cursor-pointer items-center gap-3 px-4 py-3 hover:bg-neutral-1',
                  checked && 'bg-neutral-1'
                )}
              >
                <span
                  aria-hidden
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: electrode.color }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{electrode.name}</span>
                  <span className="block text-xs text-neutral-4">
                    {electrode.contacts} contact{electrode.contacts === 1 ? '' : 's'}
                  </span>
                </span>
                <Checkbox
                  id={rowId}
                  checked={checked}
                  onCheckedChange={() => onToggle(electrode.id)}
                  aria-label={`Show ${electrode.name} in the 3D view`}
                />
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
