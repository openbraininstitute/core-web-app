import { logError } from '@/util/logger';
import { assertType } from '@/util/type-guards';

export type GetMorphoToolResult = GetMorphoToolItem[];

export interface GetMorphoToolItem {
  morphology_id: string;
  morphology_name: string;
  morphology_description: string;
  mtype: string[];
  brain_region_id: string;
  brain_region_label: string;
  subject_species_label: string;
  subject_age: string | null;
}

export function isGetMorphoToolResult(data: unknown): data is GetMorphoToolResult {
  try {
    assertType(data, [
      'array',
      {
        morphology_id: 'string',
        morphology_name: 'string',
        morphology_description: 'string',
        mtype: ['array', 'string'],
        brain_region_id: 'string',
        brain_region_label: 'string',
        subject_species_label: 'string',
        subject_age: ['|', 'string', 'null'],
      },
    ]);
    return true;
  } catch (ex) {
    logError('Unexpected type:', data);
    logError(ex);
    return false;
  }
}

export interface Morphology {
  id: string;
  name: string;
  description: string;
}
