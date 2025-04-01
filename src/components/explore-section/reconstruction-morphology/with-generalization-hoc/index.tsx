import { ReactNode, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { loadable } from 'jotai/utils';
import { resourceBasedResponseHitsAtom } from '@/state/explore-section/generalization';
import CardView from '@/components/explore-section/CardView';
import { DataType } from '@/constants/explore-section/list-views';
import { ExploreESHit } from '@/types/explore-section/es';
import {
  ReconstructedNeuronMorphology,
  ExperimentalTrace,
} from '@/types/explore-section/es-experiment';
import CentralLoadingWheel from '@/components/CentralLoadingWheel';

const spinStyles = {
  display: 'table',
  width: '100%',
  height: '200px',
  padding: 'calc(15vh - 27px) 0',
};
const loadingIconText = 'Searching for similar morphologies';
const notFoundText = 'No similar morphologies were found';

export const generalizationError = <h1>Something went wrong while fetching the data</h1>;
export const notFound = <CentralLoadingWheel style={spinStyles} text={notFoundText} noResults />;

export default function WithGeneralization({
  legacyId,
  dataType,
}: {
  legacyId: string;
  dataType: DataType;
}) {
  const resourceBasedResponseHits = useAtomValue(
    useMemo(
      () => loadable(resourceBasedResponseHitsAtom({ resourceId: legacyId, dataType })),
      [legacyId, dataType]
    )
  );

  let render: ReactNode;

  switch (resourceBasedResponseHits.state) {
    case 'loading':
      render = <CentralLoadingWheel style={spinStyles} text={loadingIconText} />;
      break;
    case 'hasError':
      render = generalizationError;
      break;
    case 'hasData':
      render = resourceBasedResponseHits.data?.length ? (
        <CardView
          data={
            resourceBasedResponseHits.data as ExploreESHit<
              ReconstructedNeuronMorphology | ExperimentalTrace
            >[]
          }
          dataType={dataType}
          resourceId={legacyId}
        />
      ) : (
        (render = notFound)
      );
      break;
    default: {
      render = notFound;
    }
  }

  return render;
}
