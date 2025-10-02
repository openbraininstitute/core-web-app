'use client';

import { ErrorBoundary } from 'react-error-boundary';
import { LoadingOutlined } from '@ant-design/icons';
import { useParams } from 'next/navigation';
import { loadable } from 'jotai/utils';
import { useAtomValue } from 'jotai';
import { memo, useMemo } from 'react';
import { Spin } from 'antd';
import get from 'lodash/get';

// We disable enhanced somas until they are fixed on the backend.
// import { useSwcContentUrl } from '@/util/content-url';

import { Morphometrics } from '@/features/entities/cell-morphology/morphometrics';
import { withErrorConfig } from '@/components/GenericErrorFallback';
import { createMorphologyDataAtom } from '@/state/morpho-viewer';
import { MorphoViewer } from '@/components/MorphoViewer';
import { ensureArray } from '@/utils/array';

import type { ICellMorphology } from '@/api/entitycore/types/entities/cell-morphology';
import type { WorkspaceContext } from '@/types/common';

export default function MorphologyDetailView({ detail }: { detail: ICellMorphology }) {
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
      {/* <ErrorBoundary
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
      )} */}
    </>
  );
}

function MorphoViewerLoader({ resource }: { resource: ICellMorphology }) {
  const ctx = useParams<WorkspaceContext>();

  const morphologyDataAtom = useMemo(
    () => loadable(createMorphologyDataAtom(resource, ctx)),
    [resource, ctx]
  );
  // We disable enhanced somas until they are fixed on the backend.
  // const swcContentUrl = useSwcContentUrl(resource.distribution);
  const morphologyData = useAtomValue(morphologyDataAtom);
  const { state } = morphologyData;

  switch (state) {
    case 'hasData':
      return morphologyData.data ? (
        <MorphoViewer
          className="h-full"
          swc={morphologyData.data}
          // We disable enhanced somas until they are fixed on the backend.
          // contentUrl={swcContentUrl}
        />
      ) : (
        <div className="border-neutral-3 flex w-full flex-col items-center justify-center gap-3 border py-20">
          No morphology data available.
        </div>
      );

    case 'loading':
      return (
        <div className="flex w-full flex-col items-center justify-center gap-3 py-20">
          <Spin indicator={<LoadingOutlined />} size="large" />
          <h2 className="text-primary-9 font-light">Loading morphology...</h2>
        </div>
      );
    case 'hasError':
      return morphologyData.error ? (
        <div className="border-neutral-2 text-primary-9 flex items-center justify-center rounded-lg border px-4 py-2 text-lg">
          <div className="mr-1">{(morphologyData.error as { message: string }).message}</div>
          <div className="font-bold">{get(morphologyData.error, 'cause.name', '')}</div>
        </div>
      ) : null;
    default:
      throw Error(`Unknown state for morphologyData: "${state}"!`);
  }
}

export const MorphoViewerLoaderMemo = memo(MorphoViewerLoader);
