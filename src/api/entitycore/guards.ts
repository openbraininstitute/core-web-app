import { EntityTypeEnum } from '@/api/entitycore/types/entity-type';

import type { EntityCoreBaseAsset } from '@/api/entitycore/types/shared/global';
import type {
  IExperimentalSynapsesPerConnection,
  IExperimentalBoutonDensity,
  IExperimentalNeuronDensity,
  IReconstructionMorphology,
  IElectricalCellRecording,
  ISingleNeuronSynaptome,
  EntityCoreObjectTypes,
  IEModel,
  IMEModel,
} from '@/api/entitycore/types';

export function hasAssets(
  obj: EntityCoreObjectTypes
): obj is EntityCoreObjectTypes & EntityCoreBaseAsset {
  return 'assets' in obj && (obj.assets === null || Array.isArray(obj.assets));
}

export function isReconstructionMorphology(
  entity: EntityCoreObjectTypes
): entity is IReconstructionMorphology {
  return entity.type === EntityTypeEnum.CellMorphology;
}

export function isElectricalCellRecording(
  entity: EntityCoreObjectTypes
): entity is IElectricalCellRecording {
  return entity.type === EntityTypeEnum.ElectricalCellRecording;
}

export function isExperimentalNeuronDensity(
  entity: EntityCoreObjectTypes
): entity is IExperimentalNeuronDensity {
  return entity.type === EntityTypeEnum.ExperimentalNeuronDensity;
}

export function isExperimentalBoutonDensity(
  entity: EntityCoreObjectTypes
): entity is IExperimentalBoutonDensity {
  return entity.type === EntityTypeEnum.ExperimentalBoutonDensity;
}

export function isExperimentalSynapsesPerConnection(
  entity: EntityCoreObjectTypes
): entity is IExperimentalSynapsesPerConnection {
  return entity.type === EntityTypeEnum.ExperimentalSynapsesPerConnection;
}

export function isSingleNeuronSynaptome(
  entity: EntityCoreObjectTypes
): entity is ISingleNeuronSynaptome {
  return entity.type === EntityTypeEnum.SingleNeuronSynaptome;
}

export function isMemodel(entity: EntityCoreObjectTypes): entity is IMEModel {
  return entity.type === EntityTypeEnum.Memodel;
}

export function isEmodel(entity: EntityCoreObjectTypes): entity is IEModel {
  return entity.type === EntityTypeEnum.Emodel;
}
