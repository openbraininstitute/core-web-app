import { JSX } from 'react';
import { notFound } from 'next/navigation';
import snakeCase from 'lodash/snakeCase';
import { downloadEntity } from '../layout';
import { DetailViewSection } from '@/entity-configuration/definitions/types';
import {
  EntityCoreExtendedType,
  getEntityByExtendedType,
} from '@/entity-configuration/domain/helpers';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import Overview from '@/ui/segments/detail-view/overview';
import Visualization from '@/ui/segments/viz';
import Analysis from '@/features/model-analysis/explorer/container';
import RelatedArtifacts from '@/ui/segments/detail-view/related-artifacts';
import Configuration from '@/ui/segments/detail-view/configuration';

export default async function Page({
  params,
}: ServerSideComponentProp<
  WorkspaceContext & { section: DetailViewSection; id: string; type: string },
  null
>) {
  const { virtualLabId, projectId, section, type, id } = await params;
  const ctx = { virtualLabId, projectId };

  const entityType = getEntityByExtendedType({ type: snakeCase(type) as EntityCoreExtendedType });
  if (!entityType || !entityType.detailViewSections.includes(section)) notFound();

  const entity = await downloadEntity({
    type: snakeCase(type) as EntityCoreExtendedType,
    ctx,
    id,
  });

  let content: JSX.Element | undefined;

  if (section === 'overview') {
    content = <Overview entity={entity} extendedType={entityType.extendedType} />;
  }
  if (section === 'visualization') {
    content = <Visualization entity={entity} ctx={ctx} />;
  }
  if (section === 'analysis') {
    content = <Analysis extendedType={entityType.extendedType} />;
  }

  if (section === 'configuration') {
    content = <Configuration entity={entity} extendedType={entityType.extendedType} ctx={ctx} />;
  }

  if (section === 'related-artifacts') {
    content = <RelatedArtifacts extendedType={entityType.extendedType} entity={entity} ctx={ctx} />;
  }

  if (!content) notFound();

  return <div className="h-full overflow-y-auto p-10">{content}</div>;
}
