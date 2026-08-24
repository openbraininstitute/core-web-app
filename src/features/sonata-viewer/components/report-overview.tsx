import Plotly from 'plotly.js-dist-min';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import createPlotlyComponent from 'react-plotly.js/factory';

import PopulationSelect from '@/features/sonata-viewer/components/population-select';
import { CHART_LINE_COLOR, OVERVIEW_GRID_CLASS_NAME } from '@/features/sonata-viewer/constants';
import { useOverviewPlotConfig } from '@/features/sonata-viewer/hooks/config-hooks';
import useResizeObserver from '@/hooks/use-resize-observer-w-ref';
import { cn } from '@/utils/css-class';

import type { Remote } from 'comlink';
import type { PlotData } from 'plotly.js-dist-min';
import type { NodeTraceData, SonataReportMetadata } from '@/features/sonata-viewer/types';
import type { SonataWorkerImpl } from '@/features/sonata-viewer/worker/sonata-worker';

const Plot = createPlotlyComponent(Plotly);

const OVERVIEW_DESIRED_POINTS = 100;

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
  traceIndex,
  label,
  units,
  variableName,
  showTitle,
  onClick,
}: {
  worker: Remote<SonataWorkerImpl>;
  populationName: string;
  traceIndex: number;
  label: string;
  units: string;
  variableName?: string;
  showTitle?: boolean;
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
        traceIndex,
        desiredPoints: OVERVIEW_DESIRED_POINTS,
      })
      .then((result) => {
        if (!cancelled) setData(result);
      });

    return () => {
      cancelled = true;
    };
  }, [inView, worker, populationName, traceIndex]);

  return (
    <div className="flex flex-col gap-8">
      {showTitle && (
        <span className="text-lg">
          {populationName}_{label}
        </span>
      )}
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
  onNodeClick: (populationName: string, traceIndex: number) => void;
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
                {pop.nodeCount} {pop.nodeCount === 1 ? 'node' : 'nodes'}
              </small>
            </div>
          )}

          <div className={OVERVIEW_GRID_CLASS_NAME}>
            {pop.traceLabels.map((label, traceIndex) => (
              <ThumbnailContainer
                // biome-ignore lint/suspicious/noArrayIndexKey: column index is the trace identity
                key={`${pop.name}-${traceIndex}`}
                worker={worker}
                populationName={pop.name}
                traceIndex={traceIndex}
                label={label}
                units={pop.dataUnits}
                variableName={variableName}
                showTitle={pop.traceLabels.length > 1}
                onClick={() => onNodeClick(pop.name, traceIndex)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
