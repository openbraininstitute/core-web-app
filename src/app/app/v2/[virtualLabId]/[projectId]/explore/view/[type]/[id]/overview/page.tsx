import { notFound } from 'next/navigation';
import { downloadEntity } from '../layout';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import {
  CommonSummaryViewFields,
  getViewDefinitionByExtendedType,
} from '@/entity-configuration/definitions/view-defs';
import { EntitySlugValue } from '@/entity-configuration/domain/slug';
import { Field } from '@/features/details-view/overview';
import { MorphoViewerLoaderMemo } from '@/features/entities/reconstruction-morphology/detail-view';
import { IReconstructionMorphology } from '@/api/entitycore/types';

export default async function Page({
  params,
}: ServerSideComponentProp<WorkspaceContext & { type: EntitySlugValue; id: string }, null>) {
  const { virtualLabId, projectId, type, id } = await params;

  const { entity, entityType } = await downloadEntity({
    type,
    ctx: { virtualLabId, projectId },
    id,
  });

  const fields = getViewDefinitionByExtendedType(entityType.extendedType)?.summaryViewFields;
  if (!fields) notFound();

  const commonFields = CommonSummaryViewFields;

  function renderViz() {
    if (entity.type === 'reconstruction_morphology') {
      return <MorphoViewerLoaderMemo resource={entity as IReconstructionMorphology} />;
    }

    return null;
  }

  const viz = renderViz();

  return (
    <div className="h-full overflow-y-auto p-10">
      <div className="mb-5">
        <div className="text-neutral-4 uppercase">Name</div>
        <div className="text-primary-8 text-2xl font-bold">{entity.name}</div>
      </div>
      <div className="grid grid-cols-3 gap-4 rounded-lg border border-gray-300 p-5">
        {[...commonFields, ...fields].map(({ className, field }) => {
          return <Field key={field} className={className} field={field} data={entity} />;
        })}
      </div>
      {viz && <div className="mt-10 h-full">{viz}</div>}
    </div>
  );
}
