'use client';

import { RegionChoiceCards } from '@/features/scan-config/components/ui-blocks/emodel-optimisation/region-choice-cards';

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
};

/**
 * "Region Assignment" tab of the E-Model optimisation parameters.
 *
 * First column: the shared section-list choice cards. Selecting a card opens the adjacent
 * ion-channel-models drawer (rendered by the columns layout) where models are assigned to the
 * region via checkboxes.
 */
export function RegionAssignment({
  rootSchema,
  selectedRegionChoice,
  setSelectedRegionChoice,
}: Props) {
  return (
    <RegionChoiceCards
      rootSchema={rootSchema}
      selectedRegionChoice={selectedRegionChoice}
      setSelectedRegionChoice={setSelectedRegionChoice}
    />
  );
}
