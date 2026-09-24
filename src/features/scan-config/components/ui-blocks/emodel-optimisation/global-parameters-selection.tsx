'use client';

import { useMemo } from 'react';

import {
  CELSIUS_KEY,
  makeGlobalParameterSelection,
  readGlobalParameters,
  SIMULATION_CONDITIONS,
  writeGlobalParameters,
} from '@/features/scan-config/components/ui-blocks/emodel-optimisation/global-parameters';
import {
  modelIdsAssignedToAnyRegion,
  pickedModelRefs,
  readMechanisms,
  readOptimizationValue,
} from '@/features/scan-config/components/ui-blocks/emodel-optimisation/mechanism-regions';
import { ParameterRow } from '@/features/scan-config/components/ui-blocks/emodel-optimisation/parameter-row';
import { SectionHeader } from '@/features/scan-config/components/ui-blocks/emodel-optimisation/section-header';
import { useResolvedModelIdentifierEntities } from '@/features/scan-config/components/ui-elements/model-identifier-multiple/use-resolved-entities';
import { useWorkspace } from '@/ui/hooks/use-workspace';

import type { ConfigValue } from '@/features/scan-config/types';

type Props = {
  /** value of the `emodel_optimisation_parameters` config key */
  value: ConfigValue;
  /** writes the next value back to the `emodel_optimisation_parameters` config key */
  onChange: (next: ConfigValue) => void;
  /** read-only mode: disables the mode radios and value inputs */
  disabled?: boolean;
};

/**
 * "Global Parameters" tab (step 4) of the E-Model optimisation parameters: the simulation
 * conditions (`v_init`, `celsius`), listed right under the header, always present and never
 * removable.
 */
export function GlobalParametersSelection({ value, onChange, disabled }: Props) {
  const { virtualLabId, projectId } = useWorkspace();

  const mechanisms = useMemo(() => readMechanisms(value), [value]);
  const globals = useMemo(() => readGlobalParameters(value), [value]);

  // Resolve the picked models off the list Mechanism Selection already resolved (shared query
  // cache), to show the temperatures the assigned ones were fitted at next to `celsius`.
  const refs = useMemo(() => pickedModelRefs(mechanisms), [mechanisms]);
  const { entities } = useResolvedModelIdentifierEntities({
    refs,
    context: { virtualLabId, projectId },
  });

  const fittedTemperatures = useMemo(() => {
    const assignedIds = modelIdsAssignedToAnyRegion(mechanisms);
    const temperatures = entities.flatMap((entity) =>
      assignedIds.has(entity.id) &&
      'temperature_celsius' in entity &&
      typeof entity.temperature_celsius === 'number'
        ? [entity.temperature_celsius]
        : []
    );
    return [...new Set(temperatures)];
  }, [mechanisms, entities]);

  return (
    <div className="flex h-full w-full min-h-0 flex-col gap-4 p-4">
      <SectionHeader
        title="Global parameters"
        description="Simulation conditions, set once for the whole simulation."
      />

      <ul className="flex flex-col gap-2">
        {SIMULATION_CONDITIONS.map(({ key, label, unit }) => (
          <ParameterRow
            key={key}
            name={label}
            unit={unit}
            hint={
              key === CELSIUS_KEY && fittedTemperatures.length > 0
                ? `Assigned models were fitted at ${fittedTemperatures.map((t) => `${t} °C`).join(', ')}`
                : undefined
            }
            checked
            disabled={disabled}
            optimizationValue={readOptimizationValue(globals[key])}
            onValueChange={(next) =>
              onChange(
                writeGlobalParameters(value, {
                  ...globals,
                  [key]: makeGlobalParameterSelection(next),
                })
              )
            }
          />
        ))}
      </ul>
    </div>
  );
}
