import { match, P } from 'ts-pattern';

import {
  DetailViewSectionsDict,
  type TDetailViewSectionDict,
} from '@/entity-configuration/definitions/types';
import Analysis from '@/ui/segments/detail-view/analysis';
import Configuration from '@/ui/segments/detail-view/configuration';
import Overview from '@/ui/segments/detail-view/overview';
import RelatedArtifacts from '@/ui/segments/detail-view/related-artifacts';
import RelatedPublications from '@/ui/segments/detail-view/related-publications';
import Results from '@/ui/segments/detail-view/results';
import Viewer3D from '@/ui/segments/detail-view/viewer-3d';

import type { TEntityByExtendedTypeConfig } from '@/entity-configuration/domain/helpers';
import type { TRetrieveEntityOutput } from '@/entity-configuration/domain/requests';
import type { WorkspaceContext } from '@/types/common';

export function detailPageSectionRenderer({
  entity,
  context,
  section,
  entityType,
  isWorkflow,
}: {
  entity: TRetrieveEntityOutput;
  entityType: NonNullable<TEntityByExtendedTypeConfig>;
  context: WorkspaceContext;
  section: TDetailViewSectionDict;
  isWorkflow: boolean;
}) {
  const content = match({ section })
    .with({ section: DetailViewSectionsDict.Overview }, () => {
      return (
        <Overview
          entity={entity}
          extendedType={entityType.extendedType}
          context={context}
          isWorkflow={isWorkflow}
        />
      );
    })
    .with(
      { section: P.union(DetailViewSectionsDict.MeshViewer, DetailViewSectionsDict.ThreeDView) },
      () => {
        return <Viewer3D entity={entity} extendedType={entityType.extendedType} />;
      }
    )
    .with({ section: DetailViewSectionsDict.Analysis }, () => {
      return <Analysis entity={entity} extendedType={entityType.extendedType} />;
    })
    .with({ section: DetailViewSectionsDict.Configuration }, () => {
      return (
        <Configuration entity={entity} extendedType={entityType.extendedType} context={context} />
      );
    })
    .with({ section: DetailViewSectionsDict.RelatedPublications }, () => {
      return <RelatedPublications entity={entity} extendedType={entityType.extendedType} />;
    })
    .with({ section: DetailViewSectionsDict.RelatedArtifacts }, () => {
      return (
        <RelatedArtifacts
          extendedType={entityType.extendedType}
          entity={entity}
          context={context}
        />
      );
    })
    .with({ section: DetailViewSectionsDict.Results }, () => {
      return <Results extendedType={entityType.extendedType} entity={entity} context={context} />;
    })
    .otherwise(() => {
      return null;
    });

  return content;
}
