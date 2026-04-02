import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';

import { CellMorphologySchema } from '@/ui/segments/contribute/cell-morphology/schema';
import { ElectricalCellRecordingSchema } from '@/ui/segments/contribute/electrical-cell-recording/schema';

const BASE_SETUP_VALUES = {
  name: 'Example contribution',
  description: 'Example description',
  brain_region_id: '123e4567-e89b-12d3-a456-426614174000',
  experiment_date: dayjs(),
};

describe('contribute shared setup schemas', () => {
  it('accepts a blank optional contact email for the cell morphology setup step', () => {
    const result = CellMorphologySchema.pick({ setup: true }).safeParse({
      setup: {
        ...BASE_SETUP_VALUES,
        contact_email: '',
      },
    });

    expect(result.success).toBe(true);
  });

  it('accepts a blank optional contact email for the electrical cell recording setup step', () => {
    const result = ElectricalCellRecordingSchema.pick({ setup: true }).safeParse({
      setup: {
        ...BASE_SETUP_VALUES,
        contact_email: '',
        recording_location: 'soma',
        recording_type: 'patch_clamp',
        recording_origin: 'in_vitro',
      },
    });

    expect(result.success).toBe(true);
  });
});
