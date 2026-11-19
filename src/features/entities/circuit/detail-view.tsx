'use client';

import dynamic from 'next/dynamic';
import { ErrorBoundary } from 'react-error-boundary';

import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { withErrorConfig } from '@/components/GenericErrorFallback';
import { WorkspaceSection } from '@/constants';
import { resolveViewerFeaturesForEntityType } from '@/entity-configuration/domain/helpers';
import { CircuitImage } from '@/features/scan-config/components/model-preview/circuit-preview';

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

/**
 * Top of a circuit's detail Overview: the interactive 3D viewer, whose own mode toggle already
 * switches between the 3D scene, the circuit visualization image and the simulation designer
 * image. Viewer feature flags come from the entity domain `viewer` policy.
 */
export function CircuitDetailViewer({
  circuit,
  extendedType,
}: {
  circuit: ICircuit;
  extendedType: TExtendedEntitiesTypeDict;
}) {
  const features = resolveViewerFeaturesForEntityType(extendedType, {
    section: WorkspaceSection.Data,
  });
  const hasImage = circuit.assets.some((a) => a.label === AssetLabel.circuit_visualization);

  return (
    <div className="mb-8 flex flex-col gap-4">
      {/* Overview sits on `bg-primary-9 text-white`; pin dark text so the viewer's
          white chrome (nodes table, menus) stays readable. */}
      <div className="h-[min(740px,80vh)] min-h-90 w-full overflow-hidden rounded-2xl border border-neutral-2 bg-white text-primary-9">
        <ErrorBoundary
          // The circuit's still image, where it has one, in place of the viewer that failed.
          fallbackRender={(props) =>
            hasImage ? (
              <CircuitImage circuit={circuit} label={AssetLabel.circuit_visualization} />
            ) : (
              <ViewerError {...props} />
            )
          }
        >
          <ModelPreview model={circuit} viewerFeatures={features} />
        </ErrorBoundary>
      </div>
    </div>
  );
}
