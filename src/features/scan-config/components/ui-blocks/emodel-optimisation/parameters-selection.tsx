'use client';

import { RegionChoiceCards } from '@/features/scan-config/components/ui-blocks/emodel-optimisation/region-choice-cards';
import { SectionHeader } from '@/features/scan-config/components/ui-blocks/emodel-optimisation/section-header';

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
  /** selects a section-list choice, opening the adjacent assigned-models drawer */
  setSelectedRegionChoice: (choice: string) => void;
};

/**
 * "Parameters Selection" tab of the E-Model optimisation parameters.
 *
 * First column: the shared section-list choice cards (identical to Region Assignment). Selecting a
 * card opens the adjacent drawer (rendered by the columns layout) listing the models already
 * assigned to that region, each of which opens a further detail drawer.
 */
export function ParametersSelection({
  rootSchema,
  selectedRegionChoice,
  setSelectedRegionChoice,
}: Props) {
  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="px-4 pt-4">
        <SectionHeader
          title="Parameter selection"
          description="Value and distance-distribution selection for one regional parameter."
        />
      </div>
      <RegionChoiceCards
        rootSchema={rootSchema}
        selectedRegionChoice={selectedRegionChoice}
        setSelectedRegionChoice={setSelectedRegionChoice}
      />
    </div>
  );
}
