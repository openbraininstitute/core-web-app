import type {
  EntityAuthorization,
  EntityCoreIdentifiable,
  EntityCoreOwnership,
  EntityCoreType,
  IContributor,
  Timestamps,
} from '../shared/global';
import type {
  ContributionFilter,
  IdFilter,
  NameFilter,
  PaginationFilter,
  SearchFilter,
  TimestampsFilter,
} from '../shared/request';

export type Author = {
  given_name: string;
  family_name: string;
};

export interface PublicationBase
  extends EntityCoreIdentifiable,
    Timestamps,
    EntityAuthorization,
    EntityCoreType,
    EntityCoreOwnership {}

export interface IPublication extends PublicationBase {
  contributions?: IContributor[] | null;
  name: string;
  description: string;
  DOI: string | null;
  title: string | null;
  authors: Author[] | null;
  publication_year: number | null;
  abstract: string | null;
}

export interface IPublicationFilter
  extends NameFilter,
    IdFilter,
    TimestampsFilter,
    ContributionFilter,
    PaginationFilter,
    SearchFilter {
  DOI: string | null;
  publication_year?: number | null;
  publication_year__in?: number[] | null;
  publication_year__lte?: number | null;
  publication_year__gte?: number | null;
}
