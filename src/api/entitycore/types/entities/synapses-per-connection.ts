import type { IBrainRegionHierarchy } from '@/api/entitycore/types/entities/brain-region';
import type { IExperimentalDensity } from '@/api/entitycore/types/shared/density';
import type { EntityCoreType, IMType } from '@/api/entitycore/types/shared/global';
import type {
  BrainRegionFilter,
  ContributionFilter,
  EtypeFilter,
  PaginationFilter,
  SharedFilter,
  StainFilter,
  SubjectFilter,
  TimestampsFilter,
} from '@/api/entitycore/types/shared/request';

export interface IExperimentalSynapsesPerConnection extends IExperimentalDensity, EntityCoreType {
  mtypes: IMType[] | null;
  pre_mtype: IMType;
  post_mtype: IMType;
  pre_region: IBrainRegionHierarchy;
  post_region: IBrainRegionHierarchy;
}

type PreRegionFilter = {
  pre_region__name?: string | null;
  pre_region__name__in?: string[] | null;
  pre_region__name__ilike?: string | null;
  pre_region__id?: number | null;
  pre_region__id_in?: number[] | null;
  pre_region__acronym?: string | null;
  pre_region__acronym__in?: string[] | null;
  pre_region__order_by?: string | null;
};

type PostRegionFilter = {
  post_region__name?: string | null;
  post_region__name_in?: string[] | null;
  post_region__name__ilike?: string | null;
  post_region__id?: number | null;
  post_region__id_in?: number[] | null;
  post_region__acronym?: string | null;
  post_region__acronym__in?: string[] | null;
  post_region__order_by?: string | null;
};

type PreMtypeFilter = {
  pre_mtype__id?: string | null;
  pre_mtype__pref_label?: string | null;
  pre_mtype__pref_label__in?: string[] | null;
  pre_mtype__order_by?: string | null;
};

type PostMtypeFilter = {
  post_mtype__id?: string | null;
  post_mtype__pref_label?: string | null;
  post_mtype__pref_label__in?: string[] | null;
  post_mtype__order_by?: string | null;
};

export type ExperimentalSynapsesPerConnectionFilter = Partial<
  SharedFilter &
    BrainRegionFilter &
    ContributionFilter &
    EtypeFilter &
    PaginationFilter &
    PostMtypeFilter &
    PostRegionFilter &
    PreMtypeFilter &
    PreRegionFilter &
    StainFilter &
    SubjectFilter &
    TimestampsFilter
>;
