import type { IPublication } from '@/api/entitycore/types/entities/publication';
import type { ScientificArtifactBase } from '@/api/entitycore/types/entities/scientific-artifact';
import type {
  EntityCoreIdentifiable,
  EntityCoreOwnership,
} from '@/api/entitycore/types/shared/global';
import type {
  IdFilter,
  NameFilter,
  OwnershipFilter,
  PaginationFilter,
  SearchFilter,
  TimestampsFilter,
} from '@/api/entitycore/types/shared/request';

export const PublicationType = {
  EntitySource: {
    key: 'entity_source',
    label: 'Entity source',
  },
  ComponentSource: {
    key: 'component_source',
    label: 'Component source',
  },
  Application: {
    key: 'application',
    label: 'Application',
  },
} as const;

export const PublicationTypeDictionary = Object.fromEntries(
  Object.entries(PublicationType).map(([name, value]) => [name, value.key])
) as {
  [K in keyof typeof PublicationType]: (typeof PublicationType)[K]['key'];
};

export type TPublicationTypeDictionary =
  (typeof PublicationTypeDictionary)[keyof typeof PublicationTypeDictionary];

type ScientificArtifactPublicationLinkBase = {
  publication_type: TPublicationTypeDictionary;
};

export interface IScientificArtifactPublicationLink
  extends EntityCoreIdentifiable,
    EntityCoreOwnership,
    ScientificArtifactPublicationLinkBase {
  publication: IPublication;
  scientific_artifact: ScientificArtifactBase;
}

export interface IScientificArtifactPublicationLinkFilter
  extends NameFilter,
    IdFilter,
    TimestampsFilter,
    OwnershipFilter,
    PaginationFilter,
    SearchFilter {
  DOI: string | null;
  publication_year?: number | null;
  publication_year__in?: number[] | null;
  publication_year__lte?: number | null;
  publication_year__gte?: number | null;
  publication__name?: string | null;
  publication__name__in?: string[] | null;
  publication__name__ilike?: string | null;

  publication__id?: string | null;
  publication__id__in?: string[] | null;

  publication__DOI?: string | null;
  publication_type?: TPublicationTypeDictionary;
  publication__publication_year?: number | null;
  publication__publication_year_in?: number[] | null;
  publication__publication_year__lte?: number | null;
  publication__publication_year__gte?: number | null;

  scientific_artifact__id?: string | null;
  scientific_artifact__id__in?: string[] | null;

  scientific_artifact__experiment_date__lte?: string | null;
  scientific_artifact__experiment_date__gte?: string | null;

  scientific_artifact__contact_id?: string | null;
}
