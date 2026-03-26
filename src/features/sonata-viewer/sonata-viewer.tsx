import { FileImageOutlined, LineChartOutlined } from '@ant-design/icons';
import { Empty, Radio, Spin } from 'antd';
import { useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import SimpleErrorComponent from '@/components/GenericErrorFallback';
import ReportDetailsView from '@/features/sonata-viewer/components/report-details-view';
import ReportOverview from '@/features/sonata-viewer/components/report-overview';
import useSonataReport from '@/features/sonata-viewer/hooks/use-sonata-report';
import { useSimulationReport } from '@/features/sonata-viewer/simulation-reports-context';

import type { RadioChangeEvent } from 'antd';
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
  const variableName = report?.variable_name;

  const [view, setView] = useState<VIEW>(VIEW.OVERVIEW);
  const [defaultPopulation, setDefaultPopulation] = useState<string>();
  const [defaultNodeId, setDefaultNodeId] = useState<number>();

  const handleViewChange = (e: RadioChangeEvent) => {
    setView(e.target.value as VIEW);
  };

  const handleNodeClick = (populationName: string, nodeId: number) => {
    setDefaultPopulation(populationName);
    setDefaultNodeId(nodeId);
    setView(VIEW.INTERACTIVE);
  };

  if (error) {
    return (
      <Empty className="p-2em" description="There was a problem loading the required resources" />
    );
  }

  if (isLoading || !metadata || !worker) {
    return <Spin />;
  }

  return (
    <div className="@container flex flex-col gap-6">
      <Radio.Group onChange={handleViewChange} value={view}>
        <Radio.Button value={VIEW.OVERVIEW}>
          <FileImageOutlined /> Overview
        </Radio.Button>

        <Radio.Button value={VIEW.INTERACTIVE}>
          <LineChartOutlined /> Interactive Details
        </Radio.Button>
      </Radio.Group>

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
          resetKeys={[metadata, defaultPopulation, defaultNodeId]}
        >
          <ReportDetailsView
            metadata={metadata}
            worker={worker}
            defaultPopulation={defaultPopulation}
            defaultNodeId={defaultNodeId}
            variableName={variableName}
          />
        </ErrorBoundary>
      )}
    </div>
  );
}
