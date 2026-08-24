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

  const traceLabels = currentPop?.traceLabels ?? [];

  const [selectedTraceIndices, setSelectedTraceIndices] = useState<number[]>(() =>
    defaultTraceIndex !== undefined && defaultTraceIndex < traceLabels.length
      ? [defaultTraceIndex]
      : defaultSelection(traceLabels.length)
  );

  const handlePopulationChange = (value: string) => {
    setSelectedPopulation(value);
    const pop = metadata.populations.find((p) => p.name === value);
    if (!pop) return;

    setSelectedTraceIndices(defaultSelection(pop.traceLabels.length));
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

        {traceLabels.length > 1 && (
          <NodeSelector
            populationName={selectedPopulation}
            traceLabels={traceLabels}
            selectedTraceIndices={selectedTraceIndices}
            onChange={setSelectedTraceIndices}
          />
        )}
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,25rem),1fr))] gap-10">
        {selectedTraceIndices.map((traceIndex) => (
          <InteractivePlot
            key={`${selectedPopulation}-${traceIndex}-${selectedTraceIndices.length}`}
            worker={worker}
            populationName={selectedPopulation}
            traceIndex={traceIndex}
            label={traceLabels[traceIndex]}
            units={currentPop?.dataUnits ?? 'mV'}
            variableName={variableName}
            showTitle={traceLabels.length > 1}
          />
        ))}
      </div>
    </div>
  );
}
