import { FileImageOutlined, LineChartOutlined } from '@ant-design/icons';
import { Empty } from 'antd';
import { useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import SimpleErrorComponent from '@/components/GenericErrorFallback';
import ReportDetailsView from '@/features/sonata-viewer/components/report-details-view';
import ReportOverview from '@/features/sonata-viewer/components/report-overview';
import SonataViewerSkeleton from '@/features/sonata-viewer/components/sonata-viewer-skeleton';
import useSonataReport from '@/features/sonata-viewer/hooks/use-sonata-report';
import { useSimulationReport } from '@/features/sonata-viewer/simulation-reports-context';
import { MotionTabs, MotionTabsList, MotionTabsTrigger } from '@/ui/molecules/motion-tabs';

import type { ComponentType } from 'react';
import type { FallbackProps } from 'react-error-boundary';
import type { ISimulationResult } from '@/api/entitycore/types/entities/simulation-result';
import type { WorkspaceContext } from '@/types/common';

const ErrorFallback = SimpleErrorComponent as unknown as ComponentType<FallbackProps>;

enum VIEW {
  OVERVIEW = 'overview',
  INTERACTIVE = 'interactive',
}

export default function SonataViewer({
  entity,
  assetId,
  ctx,
}: {
  entity: ISimulationResult;
  assetId?: string;
  ctx?: WorkspaceContext;
}) {
  const { metadata, worker, error, isLoading } = useSonataReport({ entity, assetId, ctx });

  const assetFileName = entity.assets
    ?.find((a) => a.id === assetId)
    ?.path.split('/')
    .pop();
  const report = useSimulationReport(assetFileName);
  const variableName = report?.variable_name !== 'v' ? report?.variable_name : undefined;

  const [view, setView] = useState<VIEW>(VIEW.OVERVIEW);
  const [defaultPopulation, setDefaultPopulation] = useState<string>();
  const [defaultTraceIndex, setDefaultTraceIndex] = useState<number>();

  const handleNodeClick = (populationName: string, traceIndex: number) => {
    setDefaultPopulation(populationName);
    setDefaultTraceIndex(traceIndex);
    setView(VIEW.INTERACTIVE);
  };

  if (error) {
    return (
      <Empty className="p-2em" description="There was a problem loading the required resources" />
    );
  }

  if (isLoading || !metadata || !worker) {
    return <SonataViewerSkeleton overview={view === VIEW.OVERVIEW} />;
  }

  return (
    <div className="@container flex flex-col gap-6">
      <MotionTabs
        value={view}
        onValueChange={(next) => setView(next as VIEW)}
        variant="pill"
        className="w-fit"
      >
        <MotionTabsList className="w-auto">
          <MotionTabsTrigger value={VIEW.OVERVIEW}>
            <FileImageOutlined className="mr-2" /> Overview
          </MotionTabsTrigger>

          <MotionTabsTrigger value={VIEW.INTERACTIVE}>
            <LineChartOutlined className="mr-2" /> Interactive Details
          </MotionTabsTrigger>
        </MotionTabsList>
      </MotionTabs>

      {view === VIEW.OVERVIEW && (
        <ErrorBoundary FallbackComponent={ErrorFallback} resetKeys={[metadata]}>
          <ReportOverview
            metadata={metadata}
            worker={worker}
            onNodeClick={handleNodeClick}
            variableName={variableName}
          />
        </ErrorBoundary>
      )}

      {view === VIEW.INTERACTIVE && (
        <ErrorBoundary
          FallbackComponent={ErrorFallback}
          resetKeys={[metadata, defaultPopulation, defaultTraceIndex]}
        >
          <ReportDetailsView
            metadata={metadata}
            worker={worker}
            defaultPopulation={defaultPopulation}
            defaultTraceIndex={defaultTraceIndex}
            variableName={variableName}
          />
        </ErrorBoundary>
      )}
    </div>
  );
}
