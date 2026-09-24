'use client';

/**
 * Bespoke Middle-panel renderer for the `emodel_optimisation_parameters` root element.
 *
 * Fully custom (not schema-driven): the Left panel hardcodes a single "Mechanisms" outer tab with
 * three inner tabs; this dispatches to the component for the currently selected inner tab.
 *
 * `value`/`onChange` are scoped to the `emodel_optimisation_parameters` key of the outer config —
 * each tab reads and writes that slice.
 */

import { match } from 'ts-pattern';

import { MechanismSelection } from '@/features/scan-config/components/ui-blocks/emodel-optimisation/mechanism-selection';
import { ParametersSelection } from '@/features/scan-config/components/ui-blocks/emodel-optimisation/parameters-selection';
import { RegionAssignment } from '@/features/scan-config/components/ui-blocks/emodel-optimisation/region-assignment';
import {
  type ConfigValue,
  EModelOptimisationMechanismsTabs,
  type IEModelOptimisationParameters,
} from '@/features/scan-config/types';

type Props = {
  /** selected inner-tab key (one of `EModelOptimisationMechanismsTabs`) */
  selectedTab: string;
  /** the `emodel_optimisation_parameters` root element schema (source of sub-field schemas) */
  rootSchema: IEModelOptimisationParameters;
  /** current value of the `emodel_optimisation_parameters` config key */
  value: ConfigValue;
  /** writes the next value back to the `emodel_optimisation_parameters` config key */
  onChange: (next: ConfigValue) => void;
  /** selected Region Assignment section-list choice (`name`), or '' when none is selected */
  selectedRegionChoice: string;
  /** sets the selected Region Assignment section-list choice */
  setSelectedRegionChoice: (choice: string) => void;
  /** read-only/locked: disables the editable widgets (picker, checkboxes, inputs) */
  disabled?: boolean;
};

export function EModelOptimisationParameters({
  selectedTab,
  rootSchema,
  value,
  onChange,
  selectedRegionChoice,
  setSelectedRegionChoice,
  disabled,
}: Props) {
  return match(selectedTab)
    .with(EModelOptimisationMechanismsTabs.MechanismSelection, () => (
      <MechanismSelection
        rootSchema={rootSchema}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    ))
    .with(EModelOptimisationMechanismsTabs.RegionAssignment, () => (
      <RegionAssignment
        rootSchema={rootSchema}
        value={value}
        onChange={onChange}
        selectedRegionChoice={selectedRegionChoice}
        setSelectedRegionChoice={setSelectedRegionChoice}
      />
    ))
    .with(EModelOptimisationMechanismsTabs.ParametersSelection, () => (
      <ParametersSelection
        rootSchema={rootSchema}
        value={value}
        onChange={onChange}
        selectedRegionChoice={selectedRegionChoice}
        setSelectedRegionChoice={setSelectedRegionChoice}
      />
    ))
    .otherwise(() => null);
}
