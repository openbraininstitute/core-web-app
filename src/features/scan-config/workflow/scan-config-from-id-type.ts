/**
 * ObiOne FromID discriminator strings, shared by the workflow schema-selection
 * resolution map ({@link scanConfigFromIdTypeToEntityType}) and the per-workflow
 * configure bindings ({@link fromIdTypeByBrowseType}).
 *
 * single source of truth: a new FromID type is added here once, instead of being
 * duplicated in lockstep across the two modules (a mismatch there silently
 * half-works — confirm writes a ref that resolution can't map back).
 */
export const ScanConfigFromIdType = {
  CellMorphologyFromID: 'CellMorphologyFromID',
  MEModelFromID: 'MEModelFromID',
  CircuitFromID: 'CircuitFromID',
  EMCellMeshFromID: 'EMCellMeshFromID',
  MEModelWithSynapsesCircuitFromID: 'MEModelWithSynapsesCircuitFromID',
  IonChannelModelFromID: 'IonChannelModelFromID',
} as const;

export type TScanConfigFromIdType =
  (typeof ScanConfigFromIdType)[keyof typeof ScanConfigFromIdType];
