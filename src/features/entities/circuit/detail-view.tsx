'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { withErrorConfig } from '@/components/GenericErrorFallback';
import { ViewVariant, WorkspaceSection } from '@/constants';
import { resolveViewerFeaturesForEntityType } from '@/entity-configuration/domain/helpers';
import { PillTabs, PillTabsList, PillTabsTrigger } from '@/ui/molecules/tabs';
import {
  detailViewPillTabsListClass,
  detailViewPillTabsTriggerClass,
} from '@/ui/segments/detail-view/variant-styles';
import { Visualization } from '@/ui/segments/explore/circuit/elements/visualization';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

// ModelPreview pulls in color-by (web worker + h5wasm), which must stay off the
// server bundle. Match morphology detail: fixed viewport, white surface, soft error.
const ModelPreview = dynamic(
  () => import('@/features/scan-config/components/model-preview').then((m) => m.ModelPreview),
  { ssr: false }
);

const ViewerError = withErrorConfig({
  cls: { container: 'bg-white' },
  showButtons: false,
  customError: 'Error while loading circuit viewer',
});

type TView = 'image' | '3d';

/**
 * Top of a circuit's detail Overview: its circuit_visualization image and the interactive 3D
 * viewer behind a toggle, opening on the image. A circuit without the image gets the viewer only.
 * Viewer feature flags come from the entity domain `viewer` policy.
 */
export function CircuitDetailViewer({
  circuit,
  extendedType,
}: {
  circuit: ICircuit;
  extendedType: TExtendedEntitiesTypeDict;
}) {
  const hasImage = circuit.assets.some((a) => a.label === AssetLabel.circuit_visualization);
  const [view, setView] = useState<TView>(hasImage ? 'image' : '3d');

  const features = resolveViewerFeaturesForEntityType(extendedType, {
    section: WorkspaceSection.Data,
  });

  return (
    <div className="mb-8 flex flex-col gap-4">
      {hasImage && (
        <PillTabs value={view} onValueChange={(value) => setView(value as TView)}>
          <PillTabsList className={detailViewPillTabsListClass(ViewVariant.Default)}>
            <PillTabsTrigger
              value="image"
              className={detailViewPillTabsTriggerClass(ViewVariant.Default)}
            >
              Image
            </PillTabsTrigger>
            <PillTabsTrigger
              value="3d"
              className={detailViewPillTabsTriggerClass(ViewVariant.Default)}
            >
              3D view
            </PillTabsTrigger>
          </PillTabsList>
        </PillTabs>
      )}
      {view === 'image' ? (
        <div className="overflow-hidden rounded-2xl border border-neutral-2 bg-white">
          <Visualization circuit={circuit} />
        </div>
      ) : (
        // Overview sits on `bg-primary-9 text-white`; pin dark text so the viewer's
        // white chrome (nodes table, menus) stays readable.
        <div className="h-[min(740px,80vh)] min-h-90 w-full overflow-hidden rounded-2xl border border-neutral-2 bg-white text-primary-9">
          <ErrorBoundary fallbackRender={(props) => <ViewerError {...props} />}>
            <ModelPreview model={circuit} viewerFeatures={features} />
          </ErrorBoundary>
        </div>
      )}
    </div>
  );
}
