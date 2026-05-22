import { kebabCase } from 'es-toolkit/compat';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkflowActivityDictValue } from '@/constants';
import { isSimulateCircuitSourceType } from '@/features/scan-config/workflow/simulate-circuit-workflows';

import type { TEntityTypeDict } from '@/api/entitycore/types';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TWorkspaceSection } from '@/constants';

const SIMULATE_CIRCUIT_CONFIGURE_SEGMENT = 'circuit';

/**
 * resolves the pathname segment under `workflows/{section}/configure/` for browse links
 *
 * for simulate scan-config, circuit workflows use the shared `circuit` segment; pass `dataType`
 * in the query when present, ME-model circuit uses `me-model-circuit`
 *
 * @param section - Workspace section driving the workflow (simulate, extract, process, …).
 * @param recordType - API entity type of the selected browse row.
 * @param dataType - Extended workflow type from the browse page (when present).
 * @returns URL path segment, e.g. `circuit`, `me-model-circuit`, or `kebabCase(recordType)`.
 */
export function resolveSimulateConfigureSegment({
  section,
  recordType,
  dataType,
}: {
  section: TWorkspaceSection;
  recordType: TEntityTypeDict;
  dataType?: TExtendedEntitiesTypeDict;
}): string {
  if (section !== WorkflowActivityDictValue.simulate) {
    return kebabCase(recordType);
  }

  if (dataType === ExtendedEntitiesTypeDict.MemodelCircuit) {
    return kebabCase(ExtendedEntitiesTypeDict.MemodelCircuit);
  }

  if (dataType && isSimulateCircuitSourceType(dataType)) {
    return SIMULATE_CIRCUIT_CONFIGURE_SEGMENT;
  }

  return kebabCase(recordType);
}
