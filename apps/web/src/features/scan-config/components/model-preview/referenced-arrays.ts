import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import {
  electrodeSummaryToOverlays,
  type ICircuitOverlayGroup,
} from '@/features/scan-config/components/model-preview/electrode-locations-overlay';
import { isPlainObject } from '@/features/scan-config/components/utils';
import { isFromIdRef, type TFromIdRef } from '@/features/scan-config/helpers';
import { entityTypeForScanConfigFromIdType } from '@/features/scan-config/workflow/workflow-schema-selection';

import type { TElectrodeLocationsDictionarySummary } from '@/api/one/generated/extracellular-locations-block-dictionary-summary';
import type { Config } from '@/features/scan-config/types';

/** A config block holding a reference to a stored extracellular recording array. */
export interface IReferencedArrayRef {
  /** Root element holding the block — `recordings` for simulation configs. */
  root: string;
  /** Block-dictionary entry name, unique per config; used as the overlay id. */
  block: string;
  /** `SimulatableExtracellularRecordingArray` entity id. */
  entityId: string;
}

/**
 * Type guard for an ObiOne FromID ref pointing at a recording array.
 *
 * Blocks are matched on the reference they hold rather than on a block `type`
 * const: block schemas are fetched from ObiOne at runtime, so no discriminator
 * for this block exists in the repo to compare against.
 */
function isRecordingArrayRef(value: unknown): value is TFromIdRef {
  return (
    isFromIdRef(value) &&
    entityTypeForScanConfigFromIdType(value.type) ===
      ExtendedEntitiesTypeDict.SimulatableExtracellularRecordingArray
  );
}

/**
 * Finds the first recording-array id anywhere inside a block.
 *
 * @param node - Any config subtree
 * @returns The entity uuid, or `undefined` when the block holds no such ref
 */
function findRecordingArrayId(node: unknown): string | undefined {
  if (isRecordingArrayRef(node)) return node.id_str;

  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRecordingArrayId(item);
      if (found) return found;
    }
    return undefined;
  }

  if (!isPlainObject(node)) return undefined;

  for (const value of Object.values(node)) {
    const found = findRecordingArrayId(value);
    if (found) return found;
  }
  return undefined;
}

/**
 * Collects every stored recording array a scan-config references, one per block.
 *
 * @param config - Live scan-config root
 * @returns Refs sorted by block name, so overlay order stays stable across renders
 *
 * @example
 * selectReferencedArrayRefs({
 *   recordings: {
 *     'Extracellular Electrode Array Recording 1': {
 *       extracellular_recording_array: {
 *         type: 'SimulatableExtracellularRecordingArrayFromID',
 *         id_str: '2f1a9c1e-6e1d-4a4a-9b6f-0f4c1d2e3a4b',
 *       },
 *     },
 *   },
 * });
 */
export function selectReferencedArrayRefs(
  config: Config | null | undefined
): IReferencedArrayRef[] {
  if (!config) return [];

  const refs: IReferencedArrayRef[] = [];
  for (const [root, blocks] of Object.entries(config)) {
    if (!isPlainObject(blocks)) continue;
    for (const [block, body] of Object.entries(blocks)) {
      const entityId = findRecordingArrayId(body);
      if (entityId) refs.push({ root, block, entityId });
    }
  }

  return refs.sort((a, b) => a.block.localeCompare(b.block));
}

/**
 * Re-keys a stored array's overlays onto the recording block that references it.
 *
 * Colours stay as {@link electrodeSummaryToOverlays} assigned them, so an array
 * looks the same here as in its detail view. Only `id` changes, so every contact
 * of one recording highlights as a unit and stays out of the form's write-back.
 *
 * @param block - Block-dictionary entry name of the recording
 * @param summary - Parsed `electrode_locations` asset of the referenced array
 * @returns Overlay groups, empty when the array has no stored locations
 */
export function referencedArrayOverlays(
  block: string,
  summary: TElectrodeLocationsDictionarySummary | null | undefined
): ICircuitOverlayGroup[] {
  return electrodeSummaryToOverlays(summary).map((group) => ({
    ...group,
    id: block,
    name: `${block} — ${group.name}`,
  }));
}
