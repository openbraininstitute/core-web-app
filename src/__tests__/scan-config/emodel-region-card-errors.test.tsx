import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ParametersSelection } from '@/features/scan-config/components/ui-blocks/emodel-optimisation/parameters-selection';
import { RegionAssignment } from '@/features/scan-config/components/ui-blocks/emodel-optimisation/region-assignment';

import type { ErrorObject } from 'ajv';
import type { IEModelOptimisationParameters } from '@/features/scan-config/types';

const rootSchema = {
  properties: {
    base_parameters: {
      choices: [
        { name: 'somatic', label: 'Somatic', description: '', display_order: 0, available: true },
      ],
    },
  },
} as unknown as IEModelOptimisationParameters;

const error = (instancePath: string) => ({ instancePath }) as ErrorObject;
const PARAMETER_ERROR = error('/mechanisms/mechanism_regions/somatic/0/parameters/gNa/value/value');
const ENTRY_ERROR = error('/mechanisms/mechanism_regions/somatic/0/ion_channel_model');

function somaticCardWarns(Tab: typeof RegionAssignment, errors: ErrorObject[]) {
  render(
    <Tab
      rootSchema={rootSchema}
      value={null}
      onChange={() => {}}
      selectedRegionChoice=""
      setSelectedRegionChoice={() => {}}
      errors={errors}
    />
  );
  const card = screen.getByRole('button', { name: /Somatic/ });
  return within(card).queryByRole('img', { name: 'warning' }) !== null;
}

describe('region cards flag only the errors of their tab', () => {
  it('Region Assignment ignores parameter errors', () => {
    expect(somaticCardWarns(RegionAssignment, [PARAMETER_ERROR])).toBe(false);
  });

  it('Region Assignment flags region entry errors', () => {
    expect(somaticCardWarns(RegionAssignment, [ENTRY_ERROR])).toBe(true);
  });

  it('Parameters Selection flags parameter errors', () => {
    expect(somaticCardWarns(ParametersSelection, [PARAMETER_ERROR])).toBe(true);
  });

  it('Parameters Selection ignores region entry errors', () => {
    expect(somaticCardWarns(ParametersSelection, [ENTRY_ERROR])).toBe(false);
  });
});
