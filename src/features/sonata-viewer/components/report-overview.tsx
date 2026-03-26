import Plotly from 'plotly.js-dist-min';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import createPlotlyComponent from 'react-plotly.js/factory';

import PopulationSelect from '@/features/sonata-viewer/components/population-select';
import { CHART_LINE_COLOR } from '@/features/sonata-viewer/constants';
import { useOverviewPlotConfig } from '@/features/sonata-viewer/hooks/config-hooks';
import useResizeObserver from '@/hooks/use-resize-observer-w-ref';
import { cn } from '@/utils/css-class';

import type { Remote } from 'comlink';
import type { PlotData } from 'plotly.js-dist-min';
import type { NodeTraceData, SonataReportMetadata } from '@/features/sonata-viewer/types';
import type { SonataWorkerImpl } from '@/features/sonata-viewer/worker/sonata-worker';

const Plot = createPlotlyComponent(Plotly);

const OVERVIEW_DESIRED_POINTS = 100;

const GRID_CLASS_NAME =
  'grid gap-7 pt-5 @max-xs:grid-cols-1 @lg:grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-4 @6xl:grid-cols-5 @7xl:grid-cols-6';

function ThumbnailPlot({
  data,
  plotRevision,
  units,
  variableName,
}: {
  data: NodeTraceData;
  plotRevision: number;
  units: string;
  variableName?: string;
}) {
  const { layout, config } = useOverviewPlotConfig({
    datarevision: plotRevision,
    units,
    variableName,
  });

  const plotData: Partial<PlotData>[] = [
    {
      x: Array.from(data.x),
      y: Array.from(data.y),
      type: 'scatter',
      mode: 'lines',
      line: { color: CHART_LINE_COLOR, width: 1 },
    },
  ];

  return <Plot data={plotData} className="h-full w-full" layout={layout} config={config} />;
}

function ThumbnailContainer({
  worker,
  populationName,
  nodeId,
  units,
  variableName,
  onClick,
}: {
  worker: Remote<SonataWorkerImpl>;
  populationName: string;
  nodeId: number;
  units: string;
  variableName?: string;
  onClick: () => void;
}) {
  const [data, setData] = useState<NodeTraceData | null>(null);
  const [plotRevision, setPlotRevision] = useState(0);

  const { ref: setInViewRef, inView } = useInView({
    threshold: 0,
    triggerOnce: true,
    rootMargin: '1200px',
  });

  const ref = useRef<HTMLButtonElement>(null);
  const onResize = useCallback(() => setPlotRevision((prev) => prev + 1), []);
  useResizeObserver(ref, onResize);

  useEffect(() => {
    if (ref.current) setInViewRef(ref.current);
  }, [setInViewRef]);

  useEffect(() => {
    if (!inView) return;

    let cancelled = false;
    worker
      .getNodeTrace({
        populationName,
        nodeId,
        desiredPoints: OVERVIEW_DESIRED_POINTS,
      })
      .then((result) => {
        if (!cancelled) setData(result);
      });

    return () => {
      cancelled = true;
    };
  }, [inView, worker, populationName, nodeId]);

  return (
    <div className="flex flex-col gap-8">
      <span className="text-lg">
        {populationName}_{nodeId}
      </span>
      <button
        ref={ref}
        type="button"
        className={cn('relative aspect-4/3 cursor-pointer overflow-hidden bg-gray-100')}
        onClick={onClick}
      >
        {data ? (
          <ThumbnailPlot
            data={data}
            plotRevision={plotRevision}
            units={units}
            variableName={variableName}
          />
        ) : null}
      </button>
    </div>
  );
}

export default function ReportOverview({
  metadata,
  worker,
  onNodeClick,
  variableName,
}: {
  metadata: SonataReportMetadata;
  worker: Remote<SonataWorkerImpl>;
  onNodeClick: (populationName: string, nodeId: number) => void;
  variableName?: string;
}) {
  const populationNames = useMemo(
    () => metadata.populations.map((p) => p.name),
    [metadata.populations]
  );
  const [selectedPopulation, setSelectedPopulation] = useState('All');

  const displayedPopulations = useMemo(
    () =>
      selectedPopulation === 'All'
        ? metadata.populations
        : metadata.populations.filter((p) => p.name === selectedPopulation),
    [metadata.populations, selectedPopulation]
  );

  return (
    <div className="flex flex-col gap-10">
      {populationNames.length > 1 && (
        <PopulationSelect
          populations={populationNames}
          value={selectedPopulation}
          onChange={setSelectedPopulation}
          showAllOption
        />
      )}

      {displayedPopulations.map((pop) => (
        <div key={pop.name} className="flex flex-col gap-3">
          {displayedPopulations.length > 1 && (
            <div className="text-primary-9 flex items-baseline gap-2 text-lg font-bold">
              {pop.name}
              <small className="font-light">
                {pop.nodeIds.length} {pop.nodeIds.length === 1 ? 'node' : 'nodes'}
              </small>
            </div>
          )}

          <div className={GRID_CLASS_NAME}>
            {pop.nodeIds.map((nodeId) => (
              <ThumbnailContainer
                key={`${pop.name}-${nodeId}`}
                worker={worker}
                populationName={pop.name}
                nodeId={nodeId}
                units={pop.dataUnits}
                variableName={variableName}
                onClick={() => onNodeClick(pop.name, nodeId)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
