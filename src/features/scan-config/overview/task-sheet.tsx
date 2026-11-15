'use client';

import { useQueries } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import { getLatestSimulationExecution } from '@/entity-configuration/domain/simulation/status-utils';
import { resolveOutputStrategy } from '@/features/scan-config/outputs/registry';
import { useTaskRunner } from '@/features/task-runner/hooks/queries';
import { useWorkspace } from '@/ui/hooks/use-workspace';

import { CardLabel, EntityCard, EntityGroupCard, resolvedEntityQuery } from './cards';
import { groupRefs, refTypeLabel } from './grouping';
import { RunsCard } from './runs-card';

import type { ITaskActivity } from '@/api/entitycore/types/entities/task-activity';
import type { TWorkflowTaskTypeBindings } from '@/features/scan-config/workflow/types';
import type { TSheetItem } from './run-sheet';
import type { TRunSummary } from './runs-card';

export type TTaskRow = TRunSummary & { execution: ITaskActivity | undefined };

/** Each task config with the status and timing of its latest execution. */
export function taskRows(
  configs: Array<{ id: string; name: string; scan_parameters?: Record<string, unknown> | null }>,
  executions: ITaskActivity[]
): TTaskRow[] {
  return configs.map((config) => {
    const own = executions.filter((e) => e.used?.some((u) => u.id === config.id));
    const execution = getLatestSimulationExecution({ executions: own });
    const start = execution?.start_time ? Date.parse(execution.start_time) : Number.NaN;
    const end = execution?.end_time ? Date.parse(execution.end_time) : Number.NaN;
    return {
      id: config.id,
      name: config.name,
      status: (execution?.status as ActivityStatus | undefined) ?? ActivityStatus.CREATED,
      startedAt: execution?.start_time ?? undefined,
      durationMs: end >= start ? end - start : undefined,
      params: config.scan_parameters,
      execution,
    };
  });
}

/**
 * A task campaign's runs (an extraction's, a build's, …) and, for the one picked, the entities
 * it generated, each with the workflows it can go on to.
 */
export function useTaskSheet({
  campaignId,
  bindings,
  onOpenResults,
}: {
  campaignId: string;
  bindings: TWorkflowTaskTypeBindings;
  onOpenResults: () => void;
}) {
  const context = useWorkspace();
  const { configsResponse, configsLoading, configGenerationLoading, executionsResponse } =
    useTaskRunner({
      context,
      campaignId,
      configGenerationActivityType: bindings.configGeneration,
      executionActivityType: bindings.execution,
      taskConfigType: bindings.config,
    });
  const rows = useMemo(
    () =>
      taskRows(
        (configsResponse?.configList ?? []) as Parameters<typeof taskRows>[0],
        (executionsResponse?.data ?? []) as ITaskActivity[]
      ),
    [configsResponse?.configList, executionsResponse?.data]
  );

  const [pickedId, setPickedId] = useState<string | null>(null);
  const picked =
    rows.find((r) => r.id === pickedId) ??
    rows.find((r) => r.status === ActivityStatus.DONE) ??
    rows[0];
  // what the run made, but for what the results tabs leave out too (an e-model's validation
  // results, summed up in its optimisation result)
  const made = (
    picked?.status === ActivityStatus.DONE ? (picked.execution?.generated ?? []) : []
  ).filter((ref) => resolveOutputStrategy(ref)?.id !== 'validation-result');
  // nor what resolves to nothing to open (a type with no page): kept while it loads
  const resolutions = useQueries({
    queries: made.map((ref) => resolvedEntityQuery(context, ref)),
  });
  const generated = made.filter((_, i) => {
    const query = resolutions[i];
    return !(query?.isError || (query?.isSuccess && query.data === null));
  });

  const outputs: TSheetItem[] = generated.length
    ? groupRefs(generated).map((group) => {
        const only = group.refs[0];
        return {
          id: `output:${group.key}`,
          content:
            group.refs.length === 1 && only ? (
              <EntityCard
                id={only.id}
                type={only.type}
                side="Output"
                fallbackName={only.name}
                withNextSteps
              />
            ) : (
              <EntityGroupCard
                refs={group.refs}
                typeLabel={refTypeLabel(group.type)}
                side="Output"
              />
            ),
        };
      })
    : picked
      ? [
          {
            id: 'output:none',
            content: (
              <div className="flex h-full flex-col gap-2 p-3">
                <CardLabel>Outputs</CardLabel>
                <div className="flex flex-1 items-center rounded-md bg-gray-50 p-3 text-sm text-gray-600">
                  {picked.status === ActivityStatus.DONE
                    ? 'Done, with no entity registered.'
                    : picked.status === ActivityStatus.ERROR
                      ? 'Failed. Nothing was registered.'
                      : picked.status === ActivityStatus.CREATED
                        ? 'Not launched yet.'
                        : 'Results appear here when it finishes.'}
                </div>
              </div>
            ),
          },
        ]
      : [];

  return {
    rows,
    runs: (
      <RunsCard
        noun="run"
        loading={configsLoading || configGenerationLoading}
        runs={rows}
        pickedId={picked?.id}
        onPick={setPickedId}
        onOpen={onOpenResults}
      />
    ),
    runsHeight: rows.length > 1 ? 150 + Math.ceil(rows.length / 8) * 26 : 150,
    outputs,
    outputsReady: generated.length > 0,
  };
}
