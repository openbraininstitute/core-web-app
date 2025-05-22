'use client';

import { useAtomValue } from 'jotai';
import { loadable } from 'jotai/utils';
import { ReactNode, memo, useMemo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

// We disable enhanced somas until they are fixed on the backend.
// import { useSwcContentUrl } from '@/util/content-url';

import GeneralizationControls from '@/components/explore-section/WithGeneralization/GeneralizationControls';
import { withErrorConfig } from '@/components/GenericErrorFallback';
import createMorphologyDataAtom from '@/state/morpho-viewer';

import { MorphoViewer } from '@/components/MorphoViewer';
import { DataType } from '@/constants/explore-section/list-views';
import Morphometrics from '@/features/entities/reconstruction-morphology/morphometrics';
import WithGeneralization, {
  generalizationError,
  notFound,
} from '@/features/entities/reconstruction-morphology/with-generalization-hoc';
import { ensureArray } from '@/utils/array';

import type { IReconstructionMorphology } from '@/api/entitycore/types/entities/reconstruction-morphology';

function GeneralizationContainer({ children }: { children: ReactNode }) {
  if (children !== notFound && children !== generalizationError) {
    return <div className="max-h-max min-h-max">{children}</div>;
  }
  return <div className="min-h-auto">{children}</div>;
}

export default function MorphologyDetailView({ detail }: { detail: IReconstructionMorphology }) {
  if (!detail) return null;
  return (
    <>
      {ensureArray({ input: detail.legacy_id, checkNotEmpty: true }) && (
        <Morphometrics morphology={detail} />
      )}
      <ErrorBoundary
        FallbackComponent={withErrorConfig({
          cls: { container: 'bg-white' },
          showButtons: false,
          customError: 'Error while loading morphology viewer',
        })}
      >
        <MorphoViewerLoaderMemo resource={detail} />
      </ErrorBoundary>
      <ErrorBoundary
        FallbackComponent={withErrorConfig({
          cls: { container: 'bg-white' },
          showButtons: false,
          customError: 'Error while loading similarity filter controls',
        })}
      >
        <GeneralizationControls dataType={DataType.ExperimentalNeuronMorphology} />
      </ErrorBoundary>
      {ensureArray({ input: detail.legacy_id, checkNotEmpty: true }) && (
        <GeneralizationContainer>
          <WithGeneralization
            legacyId={ensureArray({ input: detail.legacy_id }).at(0)!}
            dataType={DataType.ExperimentalNeuronMorphology}
          />
        </GeneralizationContainer>
      )}
    </>
  );
}

function MorphoViewerLoader({ resource }: { resource: IReconstructionMorphology }) {
  const morphologyDataAtom = useMemo(
    () => loadable(createMorphologyDataAtom(resource)),
    [resource]
  );
  // We disable enhanced somas until they are fixed on the backend.
  // const swcContentUrl = useSwcContentUrl(resource.distribution);
  const morphologyData = useAtomValue(morphologyDataAtom);
  const { state } = morphologyData;
  switch (state) {
    case 'hasData':
      return morphologyData.data ? (
        <MorphoViewer
          className="min-h-[75%]"
          swc={morphologyData.data}
          // We disable enhanced somas until they are fixed on the backend.
          // contentUrl={swcContentUrl}
        />
      ) : (
        <div>No data...</div>
      );
    case 'loading':
      return <div>Loading...</div>;
    case 'hasError':
      return morphologyData.error ? (
        <div>{(morphologyData.error as { message: string }).message}</div>
      ) : null;
    default:
      throw Error(`Unknown state for morphologyData: "${state}"!`);
  }
}

const MorphoViewerLoaderMemo = memo(MorphoViewerLoader);
