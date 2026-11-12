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

/** The folder of files the log's markdown links to (label `research_log_files`), if it has one. */
export function getResearchLogFiles(log: Pick<IResearchLog, 'assets'>): IAsset | undefined {
  return log.assets?.find((a) => a.label === 'research_log_files' && a.status !== 'deleted');
}

// saves are named logbook-<ms>.md, so the newest document is the one with the largest stamp
const savedAt = (asset: IAsset) => Number(/-(\d+)\.md$/.exec(asset.path)?.[1] ?? 0);

/**
 * The research log's markdown document asset, if one has been uploaded. A save that could not
 * delete the old document (only its creator and project admins may) leaves two; the newest wins.
 */
export function getResearchLogDocument(log: Pick<IResearchLog, 'assets'>): IAsset | undefined {
  return log.assets
    ?.filter((a) => a.label === 'research_log_document' && a.status !== 'deleted')
    .sort((a, b) => savedAt(b) - savedAt(a))[0];
}
