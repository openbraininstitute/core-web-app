'use client';

import { RiArrowRightLine } from '@remixicon/react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { getMEModel } from '@/api/entitycore/queries/model/me-model';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkflowActivityDictValue } from '@/constants';
import { getWorkflowLifecycleBlockReason } from '@/entity-configuration/domain/workflow-lifecycle-eligibility';
import { useFlags } from '@/features/feature-flags';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import {
  buildConfigureUrlForEntity,
  buildSimulateConfigureUrlFromDataViewEntity,
} from '@/ui/segments/workflows/config';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { cn } from '@/utils/css-class';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

import { isModelCircuit, isModelMesh, MODEL_CELL, MODEL_CIRCUITS, MODEL_MESHES } from './models';
import { useModelCircuit } from './use-model-circuit';

import type { ReactNode } from 'react';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { WorkspaceContext } from '@/types/common';
import type { TModel, TModelCircuit, TModelMesh } from './models';

const PILL =
  'inline-flex items-center gap-[8px] rounded-full border px-[18px] py-[9px] text-[13px] leading-[18px] font-medium transition-colors';
const OUTLINED = 'border-neutral-300 text-primary-9 hover:border-primary-9';
const FILLED = 'border-primary-9 bg-primary-9 text-white hover:bg-primary-8';

/** An outlined pill, everyneuron's "Open the explorer"; navy for the main action. */
export function PillLink({
  href,
  primary = false,
  children,
}: {
  href: string;
  primary?: boolean;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={cn(PILL, primary ? FILLED : OUTLINED)}>
      {children}
      {primary && <RiArrowRightLine className="size-[14px]" />}
    </Link>
  );
}

/**
 * A workflow opened with an entity picked. The address is made on the click: making it keeps the
 * pick in this tab's session, which is not worth doing for every model shown.
 */
function WorkflowAction({
  makeHref,
  blocked,
  children,
}: {
  makeHref: () => string | null;
  /** Why it cannot be run, said on the greyed pill. */
  blocked?: string | null;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={!!blocked}
      title={blocked ?? undefined}
      onClick={() => {
        const href = makeHref();
        if (href) router.push(href);
      }}
      className={cn(PILL, FILLED, 'disabled:cursor-not-allowed disabled:opacity-40')}
    >
      {children}
      <RiArrowRightLine className="size-[14px]" />
    </button>
  );
}

function dataHref(ctx: WorkspaceContext, entityId: string, dataType: TExtendedEntitiesTypeDict) {
  return `${resolveExploreDetailsPageUrl({ ctx, entityId, dataType })}/overview`;
}

/**
 * What can be done with a model from where it is shown: its page in Data, and its workflow; a circuit's
 * simulation not where it has no models to `simulate`.
 */
export function ModelActions({ model, simulate = true }: { model: TModel; simulate?: boolean }) {
  if (isModelCircuit(model)) return <CircuitActions model={model} simulate={simulate} />;
  if (isModelMesh(model)) return <MeshActions model={model} />;
  return <CellActions />;
}

/** A circuit in Data and its simulation, once it is read. */
function CircuitActions({ model, simulate }: { model: TModelCircuit; simulate: boolean }) {
  const { circuit, workspace } = useModelCircuit(MODEL_CIRCUITS[model]);
  const flags = useFlags();
  if (!circuit) return null;
  return (
    <>
      <PillLink href={dataHref(workspace, circuit.id, ExtendedEntitiesTypeDict.Circuit)}>
        View in Data
      </PillLink>
      {simulate && (
        <WorkflowAction
          blocked={getWorkflowLifecycleBlockReason(circuit)}
          makeHref={() =>
            buildSimulateConfigureUrlFromDataViewEntity({
              workspace,
              extendedType: ExtendedEntitiesTypeDict.Circuit,
              entityId: circuit.id,
              entity: circuit,
              flags,
            })
          }
        >
          Simulate
        </WorkflowAction>
      )}
    </>
  );
}

/** The cell's model in Data, and a simulation of it. */
function CellActions() {
  const workspace = useWorkspace();
  const flags = useFlags();
  const { data: memodel } = useQuery({
    queryKey: keyBuilder.entity({
      id: MODEL_CELL.id,
      context: workspace,
      type: EntityTypeDict.Memodel,
    }),
    queryFn: () => getMEModel({ id: MODEL_CELL.id, context: workspace }),
  });
  return (
    <>
      <PillLink href={dataHref(workspace, MODEL_CELL.id, ExtendedEntitiesTypeDict.Memodel)}>
        View in Data
      </PillLink>
      {memodel && (
        <WorkflowAction
          makeHref={() =>
            buildSimulateConfigureUrlFromDataViewEntity({
              workspace,
              extendedType: ExtendedEntitiesTypeDict.Memodel,
              entityId: memodel.id,
              entity: memodel,
              flags,
            })
          }
        >
          Simulate it
        </WorkflowAction>
      )}
    </>
  );
}

/** The mesh in Data, and its skeletonization: the morphology a model is built on. */
function MeshActions({ model }: { model: TModelMesh }) {
  const { meshId } = MODEL_MESHES[model];
  const workspace = useWorkspace();
  return (
    <>
      <PillLink href={dataHref(workspace, meshId, ExtendedEntitiesTypeDict.EMCellMesh)}>
        View in Data
      </PillLink>
      <WorkflowAction
        makeHref={() =>
          buildConfigureUrlForEntity({
            activity: WorkflowActivityDictValue.process,
            targetType: ExtendedEntitiesTypeDict.SkeletonizationCampaign,
            workspace,
            entityId: meshId,
            entityType: ExtendedEntitiesTypeDict.EMCellMesh,
          })
        }
      >
        Skeletonize
      </WorkflowAction>
    </>
  );
}
