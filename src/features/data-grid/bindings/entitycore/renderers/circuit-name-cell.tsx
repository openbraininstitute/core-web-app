'use client';

import { RiExternalLinkLine } from '@remixicon/react';

import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { EMPTY_PLACEHOLDER } from '@/features/data-grid/renderers/aggrid/empty-cell';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { cn } from '@/utils/css-class';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { ICellRendererProps } from '@/features/data-grid/react';

/** Cell-renderer registry key for the campaign Circuit column. */
export const CIRCUIT_NAME_RENDERER = 'circuitName';

type TCircuitLinkSource = {
  id?: string | null;
  name?: string | null;
  type?: string | null;
  scale?: string | null;
};

/**
 * Pick the detail-view dataType for a nested campaign circuit / ME-model.
 * Single-neuron circuits keep their own page; other scales fold into `circuit`.
 */
export function resolveCampaignCircuitDataType(
  circuit: TCircuitLinkSource
): TExtendedEntitiesTypeDict {
  if (circuit.type === EntityTypeDict.Memodel) {
    return ExtendedEntitiesTypeDict.Memodel;
  }
  if (circuit.scale === CircuitScaleDictionary.Single) {
    return ExtendedEntitiesTypeDict.SingleNeuronCircuit;
  }
  return ExtendedEntitiesTypeDict.Circuit;
}

/**
 * Circuit name as a detail-page link. Renders as a plain `<a>` so
 * {@link isInteractiveClick} keeps the row click (mini-detail) from firing.
 */
export function CircuitNameCell({
  row,
  value,
}: ICellRendererProps<{ circuit?: TCircuitLinkSource | null }>) {
  const { virtualLabId, projectId } = useWorkspace();
  const circuit = row?.circuit;
  const name =
    (typeof value === 'string' && value !== EMPTY_PLACEHOLDER ? value : null) ??
    circuit?.name ??
    '';

  if (!name) {
    return <span className="text-gray-300">{EMPTY_PLACEHOLDER}</span>;
  }

  if (!circuit?.id) {
    return (
      <span className="truncate text-primary-8" title={name}>
        {name}
      </span>
    );
  }

  const href = resolveExploreDetailsPageUrl({
    ctx: { virtualLabId, projectId },
    entityId: circuit.id,
    dataType: resolveCampaignCircuitDataType(circuit),
  });

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={`Open ${name}`}
      aria-label={`Open ${name} in a new tab`}
      className={cn(
        'group inline-flex max-w-full min-w-0 items-center gap-1 rounded-md',
        'px-1.5 py-0.5 -mx-1.5',
        'text-primary-8 underline-offset-[3px]',
        'transition-[background-color,color,transform] duration-100 ease-out',
        'hover:bg-primary-9/6 hover:text-primary-9 hover:underline',
        'active:scale-[0.98] active:bg-primary-9/10',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-6/35 focus-visible:ring-offset-1'
      )}
    >
      <span className="min-w-0 truncate">{name}</span>
      <RiExternalLinkLine
        aria-hidden
        size={13}
        className="shrink-0 opacity-0 transition-opacity duration-100 ease-out group-hover:opacity-55 group-focus-visible:opacity-55"
      />
    </a>
  );
}
