'use client';

import { useMemo, ReactNode, memo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useAtomValue } from 'jotai';
import { loadable } from 'jotai/utils';

// We disable enhanced somas until they are fixed on the backend.
// import { useSwcContentUrl } from '@/util/content-url';

import createMorphologyDataAtom from '@/state/morpho-viewer';
import GeneralizationControls from '@/components/explore-section/WithGeneralization/GeneralizationControls';
import SimpleErrorComponent from '@/components/GenericErrorFallback';
import Morphometrics from '@/components/explore-section/Morphometrics';
import Summary from '@/components/explore-section/details-view/summary';

import WithGeneralization, {
  notFound,
  generalizationError,
} from '@/components/explore-section/reconstruction-morphology/with-generalization-hoc';
import { DataType } from '@/constants/explore-section/list-views';
import { NEURON_MORPHOLOGY_FIELDS } from '@/constants/explore-section/detail-views-fields';
import { MorphoViewer } from '@/components/MorphoViewer';
import type { IReconstructionMorphology } from '@/api/entitycore/types/entities/reconstruction-morphology';
import { ensureArray } from '@/util/nexus';

function GeneralizationContainer({ children }: { children: ReactNode }) {
  if (children !== notFound && children !== generalizationError) {
    return <div className="min-h-[1000px]">{children}</div>;
  }
  return <div className="min-h-auto">{children}</div>;
}

export default function MorphologyDetailView() {
  return (
    <Summary<IReconstructionMorphology>
      fields={NEURON_MORPHOLOGY_FIELDS}
      dataType={DataType.ExperimentalNeuronMorphology}
    >
      {(detail) => (
        <>
          {detail.legacy_id && detail.legacy_id?.length > 0 && (
            <Morphometrics
              legacyId={ensureArray(detail.legacy_id).at(0)!}
              dataType={DataType.ExperimentalNeuronMorphology}
            />
          )}
          <MorphoViewerLoaderMemo resource={detail} />
          <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
            <GeneralizationControls dataType={DataType.ExperimentalNeuronMorphology} />
          </ErrorBoundary>
          {detail.legacy_id && detail.legacy_id?.length > 0 && (
            <GeneralizationContainer>
              <WithGeneralization
                legacyId={ensureArray(detail.legacy_id).at(0)!}
                dataType={DataType.ExperimentalNeuronMorphology}
              />
            </GeneralizationContainer>
          )}
        </>
      )}
    </Summary>
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
      return morphologyData.error ? <div>{morphologyData.error?.message}</div> : null;
    default:
      throw Error(`Unknown state for morphologyData: "${state}"!`);
  }
}

const MorphoViewerLoaderMemo = memo(MorphoViewerLoader);
