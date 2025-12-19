import type {
  EntityCoreObjectTypes,
  ICellMorphology,
  IElectricalCellRecording,
  IEModel,
  IExperimentalBoutonDensity,
  IExperimentalNeuronDensity,
  IExperimentalSynapsesPerConnection,
  IMEModel,
  ISingleNeuronSynaptome,
} from '@/api/entitycore/types';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import type { EntityCoreBaseAsset } from '@/api/entitycore/types/shared/global';

export function hasAssets(
  obj?: EntityCoreObjectTypes | null,
): obj is EntityCoreObjectTypes & EntityCoreBaseAsset {
  return !!obj && 'assets' in obj && (obj.assets === null || Array.isArray(obj.assets));
}

export function isReconstructionMorphology(
  entity: EntityCoreObjectTypes,
): entity is ICellMorphology {
  return entity.type === EntityTypeDict.CellMorphology;
}

export function isElectricalCellRecording(
  entity: EntityCoreObjectTypes,
): entity is IElectricalCellRecording {
  return entity.type === EntityTypeDict.ElectricalCellRecording;
}

export function isExperimentalNeuronDensity(
  entity: EntityCoreObjectTypes,
): entity is IExperimentalNeuronDensity {
  return entity.type === EntityTypeDict.ExperimentalNeuronDensity;
}

export function isExperimentalBoutonDensity(
  entity: EntityCoreObjectTypes,
): entity is IExperimentalBoutonDensity {
  return entity.type === EntityTypeDict.ExperimentalBoutonDensity;
}

export function isExperimentalSynapsesPerConnection(
  entity: EntityCoreObjectTypes,
): entity is IExperimentalSynapsesPerConnection {
  return entity.type === EntityTypeDict.ExperimentalSynapsesPerConnection;
}

export function isSingleNeuronSynaptome(
  entity?: EntityCoreObjectTypes | null,
): entity is ISingleNeuronSynaptome {
  return Boolean(entity) && Boolean(entity?.type === EntityTypeDict.SingleNeuronSynaptome);
}

export function isMemodel(entity: EntityCoreObjectTypes): entity is IMEModel {
  return entity.type === EntityTypeDict.Memodel;
}

export function isEmodel(entity: EntityCoreObjectTypes): entity is IEModel {
  return entity.type === EntityTypeDict.Emodel;
}
