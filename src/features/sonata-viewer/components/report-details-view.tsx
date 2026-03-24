import { useMemo, useState } from 'react';

import InteractivePlot from '@/features/sonata-viewer/components/interactive-plot';
import NodeSelector from '@/features/sonata-viewer/components/node-selector';
import PopulationSelect from '@/features/sonata-viewer/components/population-select';

import type { Remote } from 'comlink';
import type { SonataReportMetadata } from '@/features/sonata-viewer/types';
import type { SonataWorkerImpl } from '@/features/sonata-viewer/worker/sonata-worker';

const MAX_DEFAULT_ALL = 20;

export default function ReportDetailsView({
  metadata,
  worker,
  defaultPopulation,
  defaultNodeId,
}: {
  metadata: SonataReportMetadata;
  worker: Remote<SonataWorkerImpl>;
  defaultPopulation?: string;
  defaultNodeId?: number;
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

  const nodeIds = currentPop?.nodeIds ?? [];
  const defaultAll = nodeIds.length <= MAX_DEFAULT_ALL;

  const [selectedNodeIds, setSelectedNodeIds] = useState<number[]>(() => {
    if (defaultNodeId !== undefined && nodeIds.includes(defaultNodeId)) {
      return [defaultNodeId];
    }
    return defaultAll ? nodeIds : nodeIds.length > 0 ? [nodeIds[0]] : [];
  });

  const handlePopulationChange = (value: string) => {
    setSelectedPopulation(value);
    const pop = metadata.populations.find((p) => p.name === value);
    if (!pop) return;

    const canSelectAll = pop.nodeIds.length <= MAX_DEFAULT_ALL;
    setSelectedNodeIds(canSelectAll ? pop.nodeIds : pop.nodeIds.length > 0 ? [pop.nodeIds[0]] : []);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-6">
        <PopulationSelect
          populations={populationNames}
          value={selectedPopulation}
          onChange={handlePopulationChange}
          showAllOption={false}
        />

        <NodeSelector
          populationName={selectedPopulation}
          nodeIds={nodeIds}
          selectedNodeIds={selectedNodeIds}
          onChange={setSelectedNodeIds}
        />
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,30rem),1fr))] gap-10">
        {selectedNodeIds.map((nodeId) => (
          <InteractivePlot
            key={`${selectedPopulation}-${nodeId}-${selectedNodeIds.length}`}
            worker={worker}
            populationName={selectedPopulation}
            nodeId={nodeId}
            units={currentPop?.dataUnits ?? 'mV'}
          />
        ))}
      </div>
    </div>
  );
}
