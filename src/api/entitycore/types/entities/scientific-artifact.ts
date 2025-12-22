import {
  EntityCoreIdentifiable,
  EntityCoreType,
  Timestamps,
} from '@/api/entitycore/types/shared/global';

export interface ScientificArtifactBase extends EntityCoreIdentifiable, Timestamps, EntityCoreType {
  experiment_date: Date | null;
  contact_email: string | null;
  published_in: string | null;
  atlas_id: string | null;
}
