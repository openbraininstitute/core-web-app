'use client';

import { useMemo } from 'react';

import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import {
  nearestSimulation,
  scanValueId,
  sweptParameters,
} from '@/features/scan-config/components/scan-coordinates';
import { refsFromValue, scanParamValueText } from '@/features/scan-config/components/scan-params';
import { useResolvedModelIdentifierEntities } from '@/features/scan-config/components/ui-elements/model-identifier-multiple/use-resolved-entities';
import { executionStatusColorMap } from '@/features/task-runner/activity-execution/color-map';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { PillGroup, PillSelect } from '@/ui/molecules/select/pill-select';

import type { ISimulation } from '@/api/entitycore/types/entities/simulation';

type Props = {
  simulations: ISimulation[];
  activeSimulationId: string;
  statusMap: Map<string, ActivityStatus>;
  onChange: (simulation: ISimulation) => void;
};

/**
 * The simulation on show, picked by its place in the scan: a select per
 * parameter the campaign sweeps, labelled as the simulations list labels it,
 * joined on one pill where there are several. Each value is in the status
 * colour of the simulation it leads to, and only a finished one, the only kind
 * with results to show, can be picked.
 */
export function ScanParameterPicker({
  simulations,
  activeSimulationId,
  statusMap,
  onChange,
}: Props) {
  const { virtualLabId, projectId } = useWorkspace();
  const refs = useMemo(
    () => simulations.flatMap((s) => Object.values(s.scan_parameters ?? {}).flatMap(refsFromValue)),
    [simulations]
  );
  const { entities } = useResolvedModelIdentifierEntities({
    refs,
    context: { virtualLabId, projectId },
  });
  const nameById = useMemo(
    () => new Map(entities.map((entity) => [entity.id, entity.name])),
    [entities]
  );

  const active = simulations.find((s) => s.id === activeSimulationId);
  // Only what varies across the campaign is worth a select.
  const swept = useMemo(() => sweptParameters(simulations), [simulations]);
  if (!active) return null;

  const joined = swept.length > 1;
  const selects = swept.map(({ key, values }) => {
    const options = values.map(({ id, value }) => {
      const target = nearestSimulation(simulations, active, { [key]: id }) ?? active;
      const status = statusMap.get(target.id) ?? ActivityStatus.CREATED;
      return {
        value: id,
        label: scanParamValueText(value, nameById),
        color: executionStatusColorMap[status],
        detail: status,
        disabled: status !== ActivityStatus.DONE && target.id !== active.id,
      };
    });
    return (
      <PillSelect
        key={key}
        label={key.split('.').at(-1) ?? key}
        title={key}
        value={scanValueId(active.scan_parameters?.[key])}
        options={options}
        onChange={(id) => onChange(nearestSimulation(simulations, active, { [key]: id }) ?? active)}
        segment={joined}
      />
    );
  });
  // One status for them all: the simulation's they pick together.
  return joined ? (
    <PillGroup color={executionStatusColorMap[statusMap.get(active.id) ?? ActivityStatus.CREATED]}>
      {selects}
    </PillGroup>
  ) : (
    <div className="flex min-w-0 items-center gap-2">{selects}</div>
  );
}
