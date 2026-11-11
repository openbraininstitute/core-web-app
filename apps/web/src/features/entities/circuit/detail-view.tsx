'use client';

import dynamic from 'next/dynamic';
import { ErrorBoundary } from 'react-error-boundary';

import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { getAssetElement } from '@/api/entitycore/utils';
import { withErrorConfig } from '@/components/GenericErrorFallback';
import { WorkspaceSection } from '@/constants';
import { resolveViewerFeaturesForEntityType } from '@/entity-configuration/domain/helpers';
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

function hasImage(circuit: ICircuit): boolean {
  return Boolean(
    getAssetElement({
      assets: circuit.assets,
      filter: (i) => i.label === AssetLabel.circuit_visualization,
    })
  );
}

/**
 * Interactive 3D circuit viewer at the top of a circuit's detail Overview, of any scale.
 * Feature flags come from the entity domain `viewer` policy.
 */
export function CircuitDetailViewer({
  circuit,
  extendedType,
}: {
  circuit: ICircuit;
  extendedType: TExtendedEntitiesTypeDict;
}) {
  if (!circuit) return null;

  const features = resolveViewerFeaturesForEntityType(extendedType, {
    section: WorkspaceSection.Data,
  });

  return (
    // Overview sits on `bg-primary-9 text-white`; pin dark text so the viewer's
    // white chrome (nodes table, menus) stays readable.
    <div className="mb-8 h-[min(740px,80vh)] min-h-90 w-full overflow-hidden rounded-2xl border border-neutral-2 bg-white text-primary-9">
      <ErrorBoundary
        // The circuit's still image, where it has one, in place of the viewer that failed.
        fallbackRender={(props) =>
          hasImage(circuit) ? <Visualization circuit={circuit} /> : <ViewerError {...props} />
        }
      >
        <ModelPreview model={circuit} viewerFeatures={features} />
      </ErrorBoundary>
    </div>
  );
}
