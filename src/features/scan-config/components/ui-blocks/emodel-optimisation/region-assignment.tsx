'use client';

import { nonParameterErrors } from '@/features/scan-config/components/ui-blocks/emodel-optimisation/mechanism-regions';
import { RegionChoiceCards } from '@/features/scan-config/components/ui-blocks/emodel-optimisation/region-choice-cards';
import { SectionHeader } from '@/features/scan-config/components/ui-blocks/emodel-optimisation/section-header';

import type { ErrorObject } from 'ajv';
import type { ConfigValue, IEModelOptimisationParameters } from '@/features/scan-config/types';

type Props = {
  /** the `emodel_optimisation_parameters` root element schema (source of the section-list choices) */
  rootSchema: IEModelOptimisationParameters;
  /** value of the `emodel_optimisation_parameters` config key */
  value: ConfigValue;
  /** writes the next value back to the `emodel_optimisation_parameters` config key */
  onChange: (next: ConfigValue) => void;
  /** currently selected section-list choice (`name`), or '' when the drawer is closed */
  selectedRegionChoice: string;
  /** selects a section-list choice, opening the adjacent ion-channel-models drawer */
  setSelectedRegionChoice: (choice: string) => void;
  /** ajv errors inside the emodel config value (paths relative to it) */
  errors: readonly ErrorObject[];
};

/**
 * "Region Assignment" tab of the E-Model optimisation parameters.
 *
 * First column: the shared section-list choice cards. Selecting a card opens the adjacent
 * ion-channel-models drawer (rendered by the columns layout) where models are assigned to the
 * region via checkboxes. Cards flag errors in the region entries, but not in their `parameters`,
 * which belong to the Parameters Selection tab.
 */
export function RegionAssignment({
  rootSchema,
  selectedRegionChoice,
  setSelectedRegionChoice,
  errors,
}: Props) {
  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="px-4 pt-4">
        <SectionHeader
          title="Mechanisms by section list"
          description="Assign selected ion channel models to BluePyEModel section lists. The same model may be assigned to multiple section lists."
        />
      </div>
      <RegionChoiceCards
        rootSchema={rootSchema}
        selectedRegionChoice={selectedRegionChoice}
        setSelectedRegionChoice={setSelectedRegionChoice}
        errors={nonParameterErrors(errors)}
      />
    </div>
  );
}
