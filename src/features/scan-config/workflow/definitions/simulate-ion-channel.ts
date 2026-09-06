import { resolveSimulationByCampaignId } from '@/entity-configuration/domain/simulation/ion-channel-model-simulation';
import { ScanConfigCampaignOriginActionDict } from '@/features/scan-config/helpers';
import { ScanConfigActivity } from '@/features/scan-config/types';
import { defineScanConfigWorkflow } from '@/features/scan-config/workflow/define';
import { WorkflowSeed } from '@/features/scan-config/workflow/seeding/workflow-seed';
import { ScanConfigEntitySourceMode } from '@/features/scan-config/workflow/types';

import type { IonChannelModel } from '@/api/entitycore/types/entities/ion-channel';
import type { ConfigValue } from '@/features/scan-config/types';
import type { TWorkflowEntitySeed } from '@/features/scan-config/workflow/seeding/types';

/** ObiOne `property` annotation on this config's ion-channel variable recording field. */
const RECORDABLE_VARIABLES_PROPERTY = 'RecordableVariables';

type TIonChannelModelSeedSource = Pick<
  IonChannelModel,
  'id' | 'neuron_block' | 'nmodl_suffix' | 'conductance_name' | 'max_permeability_name'
>;

/**
 * Recordable variable names of an ion channel model.
 *
 * Mirrors ObiOne's `get_ion_channel_variables`
 * (`obi_one/scientific/library/ion_channel_properties.py`), which the
 * `/declared/mapped-ion-channel-properties` endpoint serves to the recording widget: currents
 * (`useion.write` entries starting with `i`) and non-specific currents are suffixed with the
 * model's NMODL suffix, concentrations (`useion.write` entries ending with `i`) keep their raw
 * name. Units are omitted — ObiOne derives them server-side.
 */
export function listRecordableVariableNames(model: TIonChannelModelSeedSource): string[] {
  const suffix = model.nmodl_suffix;
  const written = (model.neuron_block?.useion ?? []).flatMap((useion) => useion.write ?? []);

  const currents: string[] = [];
  const concentrations: string[] = [];
  for (const name of written) {
    if (name.startsWith('i')) currents.push(`${name}_${suffix}`);
    if (name.endsWith('i')) concentrations.push(name);
  }

  const nonSpecificCurrents = (model.neuron_block?.nonspecific ?? []).flatMap((entry) =>
    Object.keys(entry).map((name) => `${name}_${suffix}`)
  );

  return [...currents, ...nonSpecificCurrents, ...concentrations];
}

/**
 * Simulating an ion channel model opens on that model plus one recording per variable it can
 * record.
 *
 * The two NMODL parameter names are carried as attributes because the schema's three model blocks
 * are told apart by `entity_query.filters` over exactly those fields.
 */
export class IonChannelSimulationSeed extends WorkflowSeed<TIonChannelModelSeedSource> {
  build(entity: TIonChannelModelSeedSource): TWorkflowEntitySeed {
    return {
      attributes: {
        conductance_name: entity.conductance_name ?? null,
        max_permeability_name: entity.max_permeability_name ?? null,
      },
      properties: [
        {
          property: RECORDABLE_VARIABLES_PROPERTY,
          values: listRecordableVariableNames(entity).map<Record<string, ConfigValue>>(
            (variableName) => ({ ion_channel_id: entity.id, variable_name: variableName })
          ),
        },
      ],
    };
  }
}

export const simulateIonChannelWorkflow = defineScanConfigWorkflow({
  id: 'simulate-ion-channel-model',
  activity: ScanConfigActivity.Simulate,
  entity: {
    // the editor picks its own ion channel models, so configure opens on a session that may be
    // empty (hub entry) or carry the model seeded from a detail page's Simulate action
    mode: ScanConfigEntitySourceMode.Session,
    picksEntitiesInEditor: true,
  },
  campaign: {
    resolve: resolveSimulationByCampaignId,
  },
  seed: new IonChannelSimulationSeed(),
  editor: {
    campaignOriginAction: ScanConfigCampaignOriginActionDict.Task,
    className: 'px-4',
  },
});
