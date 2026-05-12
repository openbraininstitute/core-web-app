'use client';

import { Alert, Empty, Spin } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import { defaultVisibleColumnSet, NodesGrid } from '@/features/circuit-nodes/components/nodes-grid';
import { NodesToolbar } from '@/features/circuit-nodes/components/nodes-toolbar';
import { useCircuitConfig } from '@/features/circuit-nodes/hooks/use-circuit-config';
import { useNodesWorker } from '@/features/circuit-nodes/hooks/use-nodes-worker';
import { classNames } from '@/util/utils';

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
  const [populationName, setPopulationName] = useState<string | undefined>();

  useEffect(() => {
    onModeChange?.(mode);
  }, [mode, onModeChange]);

  // Initialize / reconcile selected population when config arrives.
  useEffect(() => {
    if (!config) return;
    if (populationName && config.nodes.some((p) => p.name === populationName)) return;
    const next = pickDefaultPopulation(config.nodes);
    setPopulationName(next?.name);
  }, [config, populationName]);

  const population = useMemo(
    () => config?.nodes.find((p) => p.name === populationName),
    [config, populationName]
  );

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

  // Set defaults when columns first arrive (or change set identity, e.g. new population).
  useEffect(() => {
    if (!columns || columns.length === 0) return;
    setVisibleColumns(defaultVisibleColumnSet(columns));
  }, [columns]);

  return (
    <div className={classNames(styles.root, styles[`mode_${mode}`], className)}>
      <NodesToolbar
        view={view}
        onViewChange={setView}
        populations={config?.nodes ?? []}
        populationName={populationName}
        onPopulationChange={setPopulationName}
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
      <Alert
        type="error"
        showIcon
        message="Could not load circuit configuration"
        description={configError.message}
      />
    );
  }
  if (configLoading) return <CenteredSpin label="Loading circuit configuration…" />;
  if (!hasPopulation) {
    return <Empty description="No node populations available" />;
  }
  if (workerError) {
    return (
      <Alert
        type="error"
        showIcon
        message="Could not load nodes dataset"
        description={workerError.message}
      />
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
