import { match } from 'ts-pattern';

import {
  DetailViewSectionsDict,
  TDetailViewSectionDict,
} from '@/entity-configuration/definitions/types';

import RelatedPublications from '@/ui/segments/detail-view/related-publications';
import RelatedArtifacts from '@/ui/segments/detail-view/related-artifacts';
import Configuration from '@/ui/segments/detail-view/configuration';
import Analysis from '@/ui/segments/detail-view/analysis';
import Overview from '@/ui/segments/detail-view/overview';
import Results from '@/ui/segments/detail-view/results';

import type { TEntityByExtendedTypeConfig } from '@/entity-configuration/domain/helpers';
import type { TRetrieveEntityOutput } from '@/entity-configuration/domain/requests';
import type { WorkspaceContext } from '@/types/common';

export function detailPageSectionRenderer({
  entity,
  context,
  section,
  entityType,
}: {
  entity: TRetrieveEntityOutput;
  entityType: NonNullable<TEntityByExtendedTypeConfig>;
  context: WorkspaceContext;
  section: TDetailViewSectionDict;
}) {
  const content = match({ section })
    .with({ section: DetailViewSectionsDict.Overview }, () => {
      return <Overview entity={entity} extendedType={entityType.extendedType} ctx={context} />;
    })
    .with({ section: DetailViewSectionsDict.Analysis }, () => {
      return <Analysis entity={entity} extendedType={entityType.extendedType} />;
    })
    .with({ section: DetailViewSectionsDict.Configuration }, () => {
      return <Configuration entity={entity} extendedType={entityType.extendedType} ctx={context} />;
    })
    .with({ section: DetailViewSectionsDict.RelatedPublications }, () => {
      return <RelatedPublications entity={entity} extendedType={entityType.extendedType} />;
    })
    .with({ section: DetailViewSectionsDict.RelatedArtifacts }, () => {
      return <RelatedArtifacts extendedType={entityType.extendedType} entity={entity} />;
    })
    .with({ section: DetailViewSectionsDict.Results }, () => {
      return <Results extendedType={entityType.extendedType} entity={entity} ctx={context} />;
    })
    .otherwise(() => {
      return null;
    });

  return content;
}
