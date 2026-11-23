import type {
  EntityAuthorization,
  EntityCoreIdentifiableNamed,
  IAsset,
  IPlatformUser,
  Timestamps,
} from '@/api/entitycore/types/shared/global';

export interface IResearchLogAsset extends Omit<IAsset, 'meta'> {
  meta: Readonly<Record<string, unknown>> | null;
}

export interface IResearchLog extends EntityCoreIdentifiableNamed, Timestamps, EntityAuthorization {
  description: string;
  created_by: IPlatformUser;
  updated_by: IPlatformUser;
  assets: Array<IResearchLogAsset>;
}

export type TResearchLogDraft = Pick<IResearchLog, 'name' | 'description'>;
