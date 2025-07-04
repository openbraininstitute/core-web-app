import { EntityTypeEnum } from '@/api/entitycore/types/entity-type';

import type { EntityCoreBaseAsset } from '@/api/entitycore/types/shared/global';
import type {
  EntityCoreObjectTypes,
  IExperimentalSynapsesPerConnection,
  IElectricalCellRecording,
  IExperimentalBoutonDensity,
  IExperimentalNeuronDensity,
  IEModel,
  IMEModel,
  IReconstructionMorphology,
  ISingleNeuronSynaptome,
} from '@/api/entitycore/types';

export function hasAssets(
  obj: EntityCoreObjectTypes
): obj is EntityCoreObjectTypes & EntityCoreBaseAsset {
  return 'assets' in obj && (obj.assets === null || Array.isArray(obj.assets));
}

function isReconstructionMorphology(
  entity: EntityCoreObjectTypes
): entity is IReconstructionMorphology {
  return entity.type === EntityTypeEnum.ReconstructionMorphology;
}

function isElectricalCellRecording(
  entity: EntityCoreObjectTypes
): entity is IElectricalCellRecording {
  return entity.type === EntityTypeEnum.ElectricalCellRecording;
}

function isExperimentalNeuronDensity(
  entity: EntityCoreObjectTypes
): entity is IExperimentalNeuronDensity {
  return entity.type === EntityTypeEnum.ExperimentalNeuronDensity;
}

function isExperimentalBoutonDensity(
  entity: EntityCoreObjectTypes
): entity is IExperimentalBoutonDensity {
  return entity.type === EntityTypeEnum.ExperimentalBoutonDensity;
}

function isExperimentalSynapsesPerConnection(
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

function isEmodel(entity: EntityCoreObjectTypes): entity is IEModel {
  return entity.type === EntityTypeEnum.Emodel;
}
