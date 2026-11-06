import type {
  EntityAuthorization,
  EntityCoreBaseAsset,
  EntityCoreOwnership,
  IAsset,
  TEntityLifecycleStatus,
  Timestamps,
} from '@/api/entitycore/types/shared/global';

/** A research log: a markdown document (asset label `research_log_document`) plus metadata. */
export interface IResearchLog
  extends Timestamps,
    EntityAuthorization,
    EntityCoreOwnership,
    EntityCoreBaseAsset {
  id: string;
  type: 'research_log';
  name: string;
  description: string;
  lifecycle_status: TEntityLifecycleStatus;
}

export type TResearchLogCreate = Pick<IResearchLog, 'name' | 'description'> & {
  authorized_public?: boolean;
};

export type TResearchLogUpdate = Partial<Pick<IResearchLog, 'name' | 'description'>>;

export type TResearchLogFilter = {
  page?: number;
  page_size?: number;
  search?: string;
  order_by?: string;
};

/** The research log's markdown document asset, if one has been uploaded. */
export function getResearchLogDocument(log: Pick<IResearchLog, 'assets'>): IAsset | undefined {
  return log.assets?.find((a) => a.label === 'research_log_document' && a.status !== 'deleted');
}
