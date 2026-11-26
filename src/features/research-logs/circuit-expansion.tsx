'use client';

import dynamic from 'next/dynamic';
import { ErrorBoundary } from 'react-error-boundary';

import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkspaceSection } from '@/constants';
import { resolveViewerFeaturesForEntityType } from '@/entity-configuration/domain/helpers';
import { PreviewColumn } from '@/features/scan-config/template/default-columns';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';

// the viewer pulls in a web worker and h5wasm, which stay off the server bundle
const ModelPreview = dynamic(
  () => import('@/features/scan-config/components/model-preview').then((m) => m.ModelPreview),
  { ssr: false }
);

/**
 * A circuit as the simulation configuration shows it: the 3D view in a box, and its nodes table
 * in one under it, either side of a grab bar.
 */
export default function CircuitExpansion({ circuit }: { circuit: ICircuit }) {
  const features = resolveViewerFeaturesForEntityType(
    circuit.scale === CircuitScaleDictionary.Single
      ? ExtendedEntitiesTypeDict.SingleNeuronCircuit
      : ExtendedEntitiesTypeDict.Circuit,
    { section: WorkspaceSection.Data }
  );

  return (
    <div className="text-primary-9 h-[min(46rem,80vh)] min-h-96 w-full rounded-2xl bg-gray-100 p-2">
      <ErrorBoundary
        fallbackRender={() => (
          <p className="text-neutral-5 p-4 text-sm">The circuit viewer could not be loaded.</p>
        )}
      >
        <PreviewColumn boxed>
          <ModelPreview model={circuit} viewerFeatures={features} />
        </PreviewColumn>
      </ErrorBoundary>
    </div>
  );
}
