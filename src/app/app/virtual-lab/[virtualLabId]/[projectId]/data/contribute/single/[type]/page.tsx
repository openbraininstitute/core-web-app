'use client';

import { snakeCase } from 'es-toolkit/compat';
import { notFound, useParams } from 'next/navigation';
import { useMemo } from 'react';
import { match } from 'ts-pattern';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { config } from '@/config';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { CellMorphology } from '@/ui/segments/contribute/cell-morphology';
import { ElectricalCellRecording } from '@/ui/segments/contribute/electrical-cell-recording';
import { EMCellMesh } from '@/ui/segments/contribute/em-cell-mesh';
import { ExperimentalBoutonDensity } from '@/ui/segments/contribute/experimental-bouton-density';
import { ExperimentalNeuronDensity } from '@/ui/segments/contribute/experimental-neuron-density';
import { ExperimentalSynapsesPerConnection } from '@/ui/segments/contribute/synapses-per-connection';
import { cn } from '@/utils/css-class';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TSingleContributionPageShell } from '@/ui/segments/contribute/shared/components/contribution-form';

export default function Page() {
  const params = useParams<{ type: string | Array<string> }>();
  const { virtualLabId, projectId } = useWorkspace();
  const sessionId = useMemo(() => crypto.randomUUID(), []);

  const rawType = params.type;
  const typeParam = Array.isArray(rawType) ? rawType[0] : rawType;
  if (!typeParam) {
    notFound();
  }
  const usedType = snakeCase(typeParam) as TExtendedEntitiesTypeDict;
  const entity = getEntityByExtendedType({ type: usedType });

  if (!entity || !(entity.isContributable ?? false)) {
    notFound();
  }

  const contributePath = `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/data/contribute`;
  const typeQs = new URLSearchParams({ m: 'single', t: usedType });
  const typeHref = `${contributePath}?${typeQs.toString()}`;
  const optionsQs = new URLSearchParams({ m: 'single', t: usedType, view: 'options' });
  const optionsHref = `${contributePath}?${optionsQs.toString()}`;

  const pageShell: TSingleContributionPageShell = {
    typeHref,
    optionsHref,
    backHref: typeHref,
    entityTitle: entity.title,
  };

  const flow = match(usedType)
    .with(ExtendedEntitiesTypeDict.CellMorphology, () => (
      <CellMorphology sessionId={sessionId} pageShell={pageShell} />
    ))
    .with(ExtendedEntitiesTypeDict.ElectricalCellRecording, () => (
      <ElectricalCellRecording sessionId={sessionId} pageShell={pageShell} />
    ))
    .with(ExtendedEntitiesTypeDict.ExperimentalNeuronDensity, () => (
      <ExperimentalNeuronDensity sessionId={sessionId} pageShell={pageShell} />
    ))
    .with(ExtendedEntitiesTypeDict.ExperimentalBoutonDensity, () => (
      <ExperimentalBoutonDensity sessionId={sessionId} pageShell={pageShell} />
    ))
    .with(ExtendedEntitiesTypeDict.ExperimentalSynapsesPerConnection, () => (
      <ExperimentalSynapsesPerConnection sessionId={sessionId} pageShell={pageShell} />
    ))
    .with(ExtendedEntitiesTypeDict.EMCellMesh, () => (
      <EMCellMesh sessionId={sessionId} pageShell={pageShell} />
    ))
    .otherwise(() => null);

  if (!flow) {
    notFound();
  }

  return (
    <div
      className={cn(
        'bg-background border-neutral-2 mx-2 ml-3 flex h-full',
        'min-h-0 w-[calc(100%-10px)] flex-col gap-4 overflow-hidden',
        'rounded-2xl border p-2 [grid-area:main]'
      )}
    >
      <div className="min-h-0 flex-1">{flow}</div>
    </div>
  );
}
