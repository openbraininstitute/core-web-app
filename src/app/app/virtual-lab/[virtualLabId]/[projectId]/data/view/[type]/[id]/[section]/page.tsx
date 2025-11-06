import { JSX } from 'react';
import { notFound } from 'next/navigation';
import { snakeCase } from 'es-toolkit/compat';

import { downloadEntity } from '../layout';
import {
  DetailViewSectionsDict,
  TDetailViewSectionDict,
} from '@/entity-configuration/definitions/types';
import {
  EntityCoreExtendedType,
  getEntityByExtendedType,
} from '@/entity-configuration/domain/helpers';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

import Overview from '@/ui/segments/detail-view/overview';
import Analysis from '@/ui/segments/detail-view/analysis';
import RelatedArtifacts from '@/ui/segments/detail-view/related-artifacts';
import RelatedPublications from '@/ui/segments/detail-view/related-publications';
import Configuration from '@/ui/segments/detail-view/configuration';
import Results from '@/ui/segments/detail-view/results';

export default async function Page({
  params,
}: ServerSideComponentProp<
  WorkspaceContext & { section: TDetailViewSectionDict; id: string; type: string },
  null
>) {
  const { virtualLabId, projectId, section, type, id } = await params;
  const ctx = { virtualLabId, projectId };

  const entityType = getEntityByExtendedType({ type: snakeCase(type) as EntityCoreExtendedType });

  if (!entityType || !entityType.detailViewSections?.includes(section)) notFound();

  const entity = await downloadEntity({
    type: snakeCase(type) as EntityCoreExtendedType,
    ctx,
    id,
  });

  let content: JSX.Element | undefined;

  if (section === DetailViewSectionsDict.Overview) {
    return <Overview entity={entity} extendedType={entityType.extendedType} ctx={ctx} />;
  }
  if (section === DetailViewSectionsDict.Analysis) {
    return <Analysis entity={entity} extendedType={entityType.extendedType} />;
  }

  if (section === DetailViewSectionsDict.Configuration) {
    return <Configuration entity={entity} extendedType={entityType.extendedType} ctx={ctx} />;
  }

  if (section === DetailViewSectionsDict.RelatedPublications) {
    return <RelatedPublications entity={entity} extendedType={entityType.extendedType} />;
  }

  if (section === DetailViewSectionsDict.RelatedArtifacts) {
    return <RelatedArtifacts extendedType={entityType.extendedType} entity={entity} />;
  }

  if (section === DetailViewSectionsDict.Results) {
    return <Results extendedType={entityType.extendedType} entity={entity} ctx={ctx} />;
  }

  if (!content) notFound();

  return content;
}
