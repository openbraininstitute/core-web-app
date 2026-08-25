import { Empty } from 'antd';
import range from 'es-toolkit/compat/range';
import { useMemo, useState } from 'react';

import InteractivePlot from '@/features/sonata-viewer/components/interactive-plot';
import NodeSelector from '@/features/sonata-viewer/components/node-selector';
import PopulationSelect from '@/features/sonata-viewer/components/population-select';

import type { Remote } from 'comlink';
import type { SonataReportMetadata } from '@/features/sonata-viewer/types';
import type { SonataWorkerImpl } from '@/features/sonata-viewer/worker/sonata-worker';

// When a population is small enough recordings for all neurons will be shown by default,
// otherwise only the first one will be selected to avoid performance issues.
const AUTO_SELECT_ALL_THRESHOLD = 20;

function defaultSelection(traceCount: number): number[] {
  return range(traceCount <= AUTO_SELECT_ALL_THRESHOLD ? traceCount : 1);
}

export default function ReportDetailsView({
  metadata,
  worker,
  defaultPopulation,
  defaultTraceIndex,
  variableName,
}: {
  metadata: SonataReportMetadata;
  worker: Remote<SonataWorkerImpl>;
  defaultPopulation?: string;
  defaultTraceIndex?: number;
  variableName?: string;
}) {
  const populationNames = useMemo(
    () => metadata.populations.map((p) => p.name),
    [metadata.populations]
  );

  const [selectedPopulation, setSelectedPopulation] = useState(
    defaultPopulation ?? populationNames[0]
  );

  const currentPop = useMemo(
    () => metadata.populations.find((p) => p.name === selectedPopulation),
    [metadata.populations, selectedPopulation]
  );

  const traces = currentPop?.traces ?? [];
  const traceLabels = useMemo(() => traces.map((t) => t.label), [traces]);

  const [selectedTraceIndices, setSelectedTraceIndices] = useState<number[]>(() =>
    defaultTraceIndex !== undefined && defaultTraceIndex < traces.length
      ? [defaultTraceIndex]
      : defaultSelection(traces.length)
  );

  const handlePopulationChange = (value: string) => {
    setSelectedPopulation(value);
    const pop = metadata.populations.find((p) => p.name === value);
    if (!pop) return;

    setSelectedTraceIndices(defaultSelection(pop.traces.length));
  };

  return (
    <div className="flex flex-col gap-14">
      <div className="flex flex-col gap-6">
        {populationNames.length > 1 && (
          <PopulationSelect
            populations={populationNames}
            value={selectedPopulation}
            onChange={handlePopulationChange}
            showAllOption={false}
          />
        )}

        {traces.length > 1 && (
          <NodeSelector
            populationName={selectedPopulation}
            traceLabels={traceLabels}
            nodeCount={currentPop?.nodeCount ?? traces.length}
            selectedTraceIndices={selectedTraceIndices}
            onChange={setSelectedTraceIndices}
          />
        )}
      </div>

      {selectedTraceIndices.length === 0 ? (
        <Empty description="No cells selected" />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,25rem),1fr))] gap-10">
          {selectedTraceIndices.map((traceIndex) => (
            <InteractivePlot
              key={`${selectedPopulation}-${traceIndex}`}
              worker={worker}
              populationName={selectedPopulation}
              traceIndex={traceIndex}
              label={traces[traceIndex]?.label ?? String(traceIndex)}
              units={currentPop?.dataUnits ?? 'mV'}
              timeUnits={currentPop?.timeConfig.units ?? 'ms'}
              variableName={variableName}
              showTitle={traces.length > 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
