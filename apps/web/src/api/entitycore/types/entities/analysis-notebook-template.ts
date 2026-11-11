import type { TEntityTypeDict } from '@/api/entitycore/types/entity-type';
import type {
  EntityAuthorization,
  EntityCoreBaseAsset,
  EntityCoreIdentifiableNamed,
  EntityCoreOwnership,
  EntityCoreType,
  Timestamps,
} from '@/api/entitycore/types/shared/global';
import type {
  ContributionFilter,
  IDFilter,
  IlikeSearchFilter,
  PaginationFilter,
  SharedFilter,
  TimestampsFilter,
} from '@/api/entitycore/types/shared/request';

export const AnalysisScaleDict = {
  Subcellular: {
    key: 'subcellular',
    label: 'Subcellular',
  },
  Cellular: {
    key: 'cellular',
    label: 'Cellular',
  },
  Circuit: {
    key: 'circuit',
    label: 'Circuit',
  },
  System: {
    key: 'system',
    label: 'System',
  },
} as const;

export const AnalysisScaleDictionary = Object.fromEntries(
  Object.entries(AnalysisScaleDict).map(([name, value]) => [name, value.key])
) as {
  [K in keyof typeof AnalysisScaleDict]: (typeof AnalysisScaleDict)[K]['key'];
};

export type TAnalysisScaleDictionary =
  (typeof AnalysisScaleDictionary)[keyof typeof AnalysisScaleDictionary];

export interface TPythonDependency {
  version: string;
}

export interface TDockerDependency {
  image_repository: string;
  /** e.g. >=2025.09.24-2 */
  image_tag?: string | null;
  /** SHA256 digest */
  image_digest?: string | null;
  /** e.g. >=20.10,<29.0 */
  docker_version?: string | null;
}

export interface TAnalysisNotebookTemplateInputType {
  name: string;
  entity_type: TEntityTypeDict;
  is_list?: boolean;
  /** minimum number of entities */
  count_min?: number;
  /** maximum number of entities */
  count_max?: number | null;
}

export interface TAnalysisNotebookTemplateSpecifications {
  schema_version?: number;
  python?: TPythonDependency | null;
  docker?: TDockerDependency | null;
  inputs: TAnalysisNotebookTemplateInputType[];
}

export interface TAnalysisNotebookTemplateBase {
  // from NameDescriptionMixin
  name: string;
  description?: string | null;
  specifications?: TAnalysisNotebookTemplateSpecifications | null;
  scale: TAnalysisScaleDictionary;
  assignment_id?: string | null;
}

export type TAnalysisNotebookTemplateFilter = Partial<
  IDFilter &
    TimestampsFilter &
    ContributionFilter &
    PaginationFilter &
    SharedFilter &
    IlikeSearchFilter & {
      assignment_id?: string | null;
      assignment_id__in?: string[] | null;
      authorized_project_id?: string | null;
      authorized_public?: boolean | null;
    }
>;

export interface IAnalysisNotebookTemplate
  extends EntityCoreIdentifiableNamed,
    Timestamps,
    EntityCoreBaseAsset,
    EntityAuthorization,
    EntityCoreType,
    EntityCoreOwnership,
    TAnalysisNotebookTemplateBase {
  description: string;
  scale: 'subcellular' | 'cellular' | 'circuit' | 'system';
  assignment_id?: string | null;
}
