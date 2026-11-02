'use client';

import { RiArrowRightLine } from '@remixicon/react';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { getCircuit } from '@/api/entitycore/queries/model/circuit';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { withErrorConfig } from '@/components/GenericErrorFallback';
import { config } from '@/config';
import { getWorkflowLifecycleBlockReason } from '@/entity-configuration/domain/workflow-lifecycle-eligibility';
import { circuitMorphologiesFlag, FlagsProvider, useFlags } from '@/features/feature-flags';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Skeleton } from '@/ui/molecules/skeleton';
import {
  STAGE_VIEW_CLASS,
  StageAction,
  StageCaption,
} from '@/ui/segments/project/start/stage-text';
import { buildSimulateConfigureUrlFromDataViewEntity } from '@/ui/segments/workflows/config';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { FullscreenPortalScope } from '@/utils/fullscreen';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { ICircuitExample } from '@/ui/segments/project/start/items';

// The viewer brings workers, WebGPU and h5wasm, none of which can be rendered on the server.
const CircuitScene = dynamic(
  () => import('@/features/circuit-viewer/circuit-scene').then((m) => m.CircuitScene),
  { ssr: false }
);

const NO_NODES_TABLE = { nodesTable: false, electrodes: false };

function details(circuit: ICircuit | undefined): string {
  if (!circuit) return ' ';
  const neurons = `${circuit.number_neurons.toLocaleString('en')} neurons`;
  return circuit.number_synapses
    ? `${neurons} · ${circuit.number_synapses.toLocaleString('en')} synapses`
    : neurons;
}

function Viewer({
  circuit,
  example,
  root,
}: {
  circuit: ICircuit;
  example: ICircuitExample;
  root: HTMLDivElement | null;
}) {
  const flags = useFlags();
  // Drawn as morphologies whatever the user's own setting of the flag.
  const withMorphologies = useMemo(
    () => ({ ...flags, [circuitMorphologiesFlag.key]: true }),
    [flags]
  );

  return (
    <ErrorBoundary
      FallbackComponent={withErrorConfig({
        cls: { container: 'bg-white' },
        showButtons: false,
        customError: 'Error while loading the circuit viewer',
      })}
    >
      <FlagsProvider flags={withMorphologies}>
        <FullscreenPortalScope root={root}>
          <CircuitScene
            circuit={circuit}
            largeCircuit
            viewerDefaults={example.viewerDefaults}
            frameZoom={example.frameZoom}
            features={NO_NODES_TABLE}
            fullscreen={{ target: root }}
          />
        </FullscreenPortalScope>
      </FlagsProvider>
    </ErrorBoundary>
  );
}

/**
 * A circuit in Pavlo's viewer with its title and size underneath. A private one is drawn only on
 * the home page of its own project, the one it can be read from; elsewhere the stage links there.
 */
export function CircuitStage({ example }: { example: { key: string } & ICircuitExample }) {
  const workspace = useWorkspace();
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const home = example.workspace;
  const readable = !home || workspace.projectId === home.projectId;

  const { data: circuit, isError } = useQuery({
    queryKey: keyBuilder.oneCircuit({ ...workspace, entityId: example.circuitId }),
    queryFn: () => getCircuit({ id: example.circuitId, context: workspace }),
    enabled: readable,
  });

  // As the circuit's own page offers them; its Simulate keeps the circuit in this tab's session.
  const flags = useFlags();
  const simulateHref = useMemo(
    () =>
      circuit
        ? buildSimulateConfigureUrlFromDataViewEntity({
            workspace,
            extendedType: ExtendedEntitiesTypeDict.Circuit,
            entityId: circuit.id,
            entity: circuit,
            flags,
          })
        : null,
    [circuit, workspace, flags]
  );
  const blocked = circuit ? getWorkflowLifecycleBlockReason(circuit) : null;

  return (
    <div className="flex size-full flex-col gap-[14px]">
      <div ref={setRoot} className={STAGE_VIEW_CLASS}>
        {!readable && home && (
          <div className="flex h-full flex-col items-center justify-center gap-[16px] p-[22px] text-center">
            <p className="max-w-[420px] text-[13px] leading-[17px]">
              This circuit belongs to the Shared results + tests project, the only place it can be
              read from.
            </p>
            <Link
              href={`${config.ROOT_ROUTE}/${home.virtualLabId}/${home.projectId}?show=${example.key}`}
              className="bg-primary-9 flex items-center gap-[10px] rounded-[23px] px-[20px] pt-[13px] pb-[14px] text-[14px] leading-[19px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              Open it there
              <RiArrowRightLine className="size-[14px]" />
            </Link>
          </div>
        )}
        {readable && isError && (
          <div className="flex h-full items-center justify-center p-[22px] text-[13px]">
            The circuit could not be loaded.
          </div>
        )}
        {readable && !isError && !circuit && <Skeleton className="size-full rounded-none" />}
        {circuit && <Viewer circuit={circuit} example={example} root={root} />}
      </div>
      <StageCaption title={example.title} details={details(circuit)}>
        {circuit && (
          <>
            <StageAction
              href={`${resolveExploreDetailsPageUrl({ ctx: workspace, entityId: circuit.id, dataType: ExtendedEntitiesTypeDict.Circuit })}/overview`}
            >
              View in Data
            </StageAction>
            <StageAction
              primary
              href={blocked ? null : simulateHref}
              title={blocked ?? (simulateHref ? undefined : 'Not simulatable here')}
            >
              Simulate
              <RiArrowRightLine className="size-[14px]" />
            </StageAction>
          </>
        )}
      </StageCaption>
    </div>
  );
}
