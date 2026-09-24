import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EModelOptimisationMechanismsTabList } from '@/features/scan-config/components/emodel-optimisation-mechanisms-tabs';
import { EModelOptimisationMechanismsTabs } from '@/features/scan-config/types';

import type { ErrorObject } from 'ajv';

const ROOT = 'emodel_optimisation_parameters';

/** The subtabs showing a warning when the config has errors at `paths` (relative to the root). */
function warnedTabs(paths: string[]) {
  const errors = paths.map((path) => ({ instancePath: `/${ROOT}${path}` }) as ErrorObject);
  render(
    <EModelOptimisationMechanismsTabList
      rootElement={ROOT}
      selectedRootElement={ROOT}
      selectedMechanismsTab=""
      onSelectTab={() => {}}
      errors={errors}
    />
  );

  return Object.values(EModelOptimisationMechanismsTabs).filter((tab) =>
    within(screen.getByTestId(`scan-config-emodel-mechanisms-tab-${tab}`)).queryByRole('img', {
      name: 'warning',
    })
  );
}

describe('EModelOptimisationMechanismsTabList', () => {
  it('shows a check on every tab when the config is valid', () => {
    expect(warnedTabs([])).toEqual([]);
    expect(screen.getAllByRole('img', { name: 'check-circle' })).toHaveLength(4);
  });

  it('flags Mechanism Selection while nothing has been written', () => {
    expect(warnedTabs([''])).toEqual([EModelOptimisationMechanismsTabs.MechanismSelection]);
  });

  it('flags Mechanism Selection for ion channel model errors', () => {
    expect(warnedTabs(['/mechanisms/ion_channel_models/0/id_str'])).toEqual([
      EModelOptimisationMechanismsTabs.MechanismSelection,
    ]);
  });

  it('flags Region Assignment for region entry errors', () => {
    expect(warnedTabs(['/mechanisms/mechanism_regions/somatic/0/ion_channel_model'])).toEqual([
      EModelOptimisationMechanismsTabs.RegionAssignment,
    ]);
  });

  it('flags Parameters Selection, not Region Assignment, for parameter errors', () => {
    expect(
      warnedTabs(['/mechanisms/mechanism_regions/somatic/0/parameters/gNa/value/bounds'])
    ).toEqual([EModelOptimisationMechanismsTabs.ParametersSelection]);
  });

  it('flags Global Parameters for global parameter errors', () => {
    expect(warnedTabs(['/global_parameters/celsius/value/value'])).toEqual([
      EModelOptimisationMechanismsTabs.GlobalParameters,
    ]);
  });
});
