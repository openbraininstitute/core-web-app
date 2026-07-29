import { getTaskResult, getTaskResults } from '@/api/entitycore/queries/task';
import { TaskResultType } from '@/api/entitycore/types/entities/task-result';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { ITaskResult, ITaskResultFilter } from '@/api/entitycore/types/entities/task-result';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { WorkspaceContext } from '@/types/common';

/**
 * What obi-one records about the recordings a result was extracted from.
 *
 * Keys mirror `ElectricalCellRecording`'s own fields, which is what lets the flattening below
 * hand the record to the shared field renderers untouched.
 */
type TEFeatureExtractionResultPayload = {
  etypes?: unknown;
  brain_region?: unknown;
  subject?: unknown;
};

type TEFeatureExtractionResult = ITaskResult<TEFeatureExtractionResultPayload>;

/**
 * Lift `data_payload` onto the record.
 *
 * A `TaskResult` has no e-type, brain region or species column of its own, so the shared field
 * definitions — which read `etypes`, `brain_region` and `subject` off the entity — would render
 * every one of them empty. Flattening here keeps that knowledge in one place: the columns, the
 * detail sections and the filters all work with no special-casing, and the day entitycore
 * exposes these as real fields this becomes a no-op.
 */
function withPayloadFields(record: TEFeatureExtractionResult) {
  const { etypes, brain_region, subject } = record.data_payload ?? {};
  return { ...record, etypes, brain_region, subject };
}

const resultTypeFilter = {
  task_result_type: TaskResultType.EFeatureExtractionResult,
} satisfies Partial<ITaskResultFilter>;

async function list(params: {
  withFacets?: boolean;
  filters?: Partial<ITaskResultFilter>;
  context?: WorkspaceContext | null;
}) {
  const response = await getTaskResults<TEFeatureExtractionResultPayload>({
    ...params,
    filters: { ...params.filters, ...resultTypeFilter },
  });

  return { ...response, data: response.data.map(withPayloadFields) };
}

async function one(params: { id: string; context?: WorkspaceContext | null }) {
  const record = await getTaskResult<TEFeatureExtractionResultPayload>(params);
  return withPayloadFields(record);
}

export const EFeatureExtractionResult: EntityCoreTypeConfig<TEFeatureExtractionResult> = {
  group: EntityTypeGroup.Experimental,
  title: 'Intracellular e-feature extraction',
  extendedType: ExtendedEntitiesTypeDict.EFeatureExtractionResult,
  type: EntityTypeDict.TaskResult,
  slug: EntitySlug.EFeatureExtractionResult,
  api: {
    config: {
      // data_payload is an opaque JSON blob to entitycore, so it cannot facet on these columns
      allowedFacets: false,
      ilikeSearchEnabled: true,
      extraQueryKeyBuilder: resultTypeFilter,
    },
    query: {
      list,
      one,
    },
  },
  asset: { extension: 'application/json' },
  detailViewSections: [DetailViewSectionsDict.Overview],
  isDownloadable: true,
  isBookmarkable: false,
  isCopyable: true,
  isSimulatable: false,
} as const;
