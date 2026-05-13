'use client';

import { Empty, Spin } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';

import { defaultVisibleColumnSet, NodesGrid } from '@/features/circuit-nodes/components/nodes-grid';
import { NodesToolbar } from '@/features/circuit-nodes/components/nodes-toolbar';
import { useCircuitConfig } from '@/features/circuit-nodes/hooks/use-circuit-config';
import { useNodesWorker } from '@/features/circuit-nodes/hooks/use-nodes-worker';
import { GenericError } from '@/ui/molecules/generic-error';
import { cn } from '@/utils/css-class';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { DisplayMode, NodePopulation, ViewMode } from '@/features/circuit-nodes/types';

import styles from '@/features/circuit-nodes/circuit-nodes-table.module.css';

type Props = {
  circuit: ICircuit;
  className?: string;
  onModeChange?: (mode: DisplayMode) => void;
};

function pickDefaultPopulation(populations: NodePopulation[]): NodePopulation | undefined {
  if (populations.length === 0) return undefined;
  return populations.find((p) => p.type === 'biophysical') ?? populations[0];
}

export default function CircuitNodesTable({ circuit, className, onModeChange }: Props) {
  const { config, isLoading: configLoading, error: configError } = useCircuitConfig(circuit);

  const [view, setView] = useState<ViewMode>('nodes');
  const [mode, setMode] = useState<DisplayMode>('collapsed');
  const [selectedPopulationName, setSelectedPopulationName] = useState<string | undefined>();

  useEffect(() => {
    onModeChange?.(mode);
  }, [mode, onModeChange]);

  const population = useMemo(() => {
    if (!config) return undefined;
    const current = config.nodes.find((p) => p.name === selectedPopulationName);
    return current ?? pickDefaultPopulation(config.nodes);
  }, [config, selectedPopulationName]);

  const populationName = population?.name;

  const enabled = mode !== 'collapsed' && view === 'nodes';

  const {
    rowCount,
    filteredCount,
    columns,
    datasource,
    isLoading: workerLoading,
    error: workerError,
  } = useNodesWorker({
    enabled,
    circuitId: circuit.id,
    circuitAssetId: config?.circuitAssetId ?? '',
    population,
  });

  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set());
  const lastColumnsKeyRef = useRef<string>('');

  useEffect(() => {
    if (!columns || columns.length === 0) return;
    const key = columns.map((c) => c.name).join('|');
    if (key === lastColumnsKeyRef.current) return;
    lastColumnsKeyRef.current = key;
    setVisibleColumns(defaultVisibleColumnSet(columns));
  }, [columns]);

  return (
    <div className={cn(styles.root, styles[`mode_${mode}`], className)}>
      <NodesToolbar
        view={view}
        onViewChange={setView}
        populations={config?.nodes ?? []}
        populationName={populationName}
        onPopulationChange={setSelectedPopulationName}
        mode={mode}
        onModeChange={setMode}
      />
      {mode !== 'collapsed' && (
        <div className={styles.body}>
          {renderBody({
            configError,
            configLoading,
            workerError,
            workerLoading,
            hasPopulation: !!population,
            columns,
            rowCount,
            filteredCount,
            datasource,
            visibleColumns,
            setVisibleColumns,
          })}
        </div>
      )}
    </div>
  );
}

function renderBody({
  configError,
  configLoading,
  workerError,
  workerLoading,
  hasPopulation,
  columns,
  rowCount,
  filteredCount,
  datasource,
  visibleColumns,
  setVisibleColumns,
}: {
  configError: Error | null;
  configLoading: boolean;
  workerError: Error | null;
  workerLoading: boolean;
  hasPopulation: boolean;
  columns: ReturnType<typeof useNodesWorker>['columns'];
  rowCount: number;
  filteredCount: number | null;
  datasource: ReturnType<typeof useNodesWorker>['datasource'];
  visibleColumns: Set<string>;
  setVisibleColumns: (next: Set<string>) => void;
}) {
  if (configError) {
    return (
      <div className={styles.centered}>
        <GenericError
          content={
            <>
              Could not load circuit configuration
              <span className="mt-2 block text-base opacity-80">{configError.message}</span>
            </>
          }
        />
      </div>
    );
  }
  if (configLoading) return <CenteredSpin label="Loading circuit configuration…" />;
  if (!hasPopulation) {
    return <Empty description="No node populations available" />;
  }
  if (workerError) {
    return (
      <div className={styles.centered}>
        <GenericError
          content={
            <>
              Could not load nodes dataset
              <span className="mt-2 block text-base opacity-80">{workerError.message}</span>
            </>
          }
        />
      </div>
    );
  }
  if (workerLoading || !columns || !datasource) {
    return <CenteredSpin label="Loading nodes…" />;
  }
  return (
    <NodesGrid
      columns={columns}
      rowCount={rowCount}
      filteredCount={filteredCount}
      datasource={datasource}
      visibleColumns={visibleColumns}
      onVisibleColumnsChange={setVisibleColumns}
    />
  );
}

function CenteredSpin({ label }: { label: string }) {
  return (
    <div className={styles.centered}>
      <Spin tip={label} size="large">
        <div className={styles.spinBox} />
      </Spin>
    </div>
  );
}
