import { notFound } from 'next/navigation';
import {
  CommonSummaryViewFields,
  getViewDefinitionByExtendedType,
} from '@/entity-configuration/definitions/view-defs';
import { Field } from '@/features/details-view/overview';
import ModelDetails from '@/features/entities/neuron-simulation/elements/me-model-details';
import { EntityTypeValue } from '@/entity-configuration/domain';
import { EntityCoreExtendedType } from '@/entity-configuration/domain/helpers';
import { resolveSingleNeuronSimulation } from '@/entity-configuration/domain/simulation';
import { AwaitedType, WorkspaceContext } from '@/types/common';

export default async function Overview({
  entity,
  extendedType,
  ctx,
}: {
  entity?: EntityTypeValue;
  extendedType: EntityCoreExtendedType;
  ctx: WorkspaceContext;
}) {
  const fields = getViewDefinitionByExtendedType(extendedType)?.summaryViewFields ?? [];

  if (!entity) notFound();
  const commonFields = CommonSummaryViewFields;

  let singleNeuronSimulationPayload:
    | AwaitedType<ReturnType<typeof resolveSingleNeuronSimulation>>
    | undefined;
  if (extendedType === 'single_neuron_simulation') {
    try {
      singleNeuronSimulationPayload = await resolveSingleNeuronSimulation(entity.id, ctx);
    } catch {
      notFound();
    }
  }

  return (
    <>
      <div className="mb-5">
        <div className="text-neutral-4 uppercase">Name</div>
        <div className="text-primary-8 text-2xl font-bold">{entity.name}</div>
      </div>
      <div className="mb-5 grid grid-cols-3 gap-4 rounded-lg border border-gray-300 p-5">
        {[...commonFields, ...fields].map(({ className, field }) => {
          return <Field key={field} className={className} field={field} data={entity} />;
        })}
      </div>
      {extendedType === 'single_neuron_simulation' && singleNeuronSimulationPayload && (
        <ModelDetails
          meModel={singleNeuronSimulationPayload.memodel}
          virtualLabId={ctx.virtualLabId}
          projectId={ctx.projectId}
        />
      )}
    </>
  );
}
