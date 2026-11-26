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

/** A research log: a markdown document (asset label `research_log_document`) plus metadata. */
export interface IResearchLog extends EntityCoreIdentifiableNamed, Timestamps, EntityAuthorization {
  description: string;
  created_by: IPlatformUser;
  updated_by: IPlatformUser;
  assets: Array<IResearchLogAsset>;
}

export type TResearchLogDraft = Pick<IResearchLog, 'name' | 'description'>;

export type TResearchLogCreate = TResearchLogDraft & {
  authorized_public?: boolean;
};

export type TResearchLogUpdate = Partial<TResearchLogDraft>;

export type TResearchLogFilter = {
  page?: number;
  page_size?: number;
  search?: string;
  order_by?: string;
};

/** The folder of files the log's markdown links to (label `research_log_files`), if it has one. */
export function getResearchLogFiles(
  log: Pick<IResearchLog, 'assets'>
): IResearchLogAsset | undefined {
  return log.assets?.find((a) => a.label === 'research_log_files' && a.status !== 'deleted');
}

// saves are named logbook-<ms>.md, so the newest document is the one with the largest stamp
const savedAt = (asset: IResearchLogAsset) => Number(/-(\d+)\.md$/.exec(asset.path)?.[1] ?? 0);

/**
 * The research log's markdown document asset, if one has been uploaded. A save that could not
 * delete the old document (only its creator and project admins may) leaves two; the newest wins.
 */
export function getResearchLogDocument(
  log: Pick<IResearchLog, 'assets'>
): IResearchLogAsset | undefined {
  return log.assets
    ?.filter((a) => a.label === 'research_log_document' && a.status !== 'deleted')
    .sort((a, b) => savedAt(b) - savedAt(a))[0];
}
