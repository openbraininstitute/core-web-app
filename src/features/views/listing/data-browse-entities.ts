import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

/**
 * The dataTypes the Data-browse `entity/[type]` route will render; anything else 404s.
 *
 * Exported so `registry-coverage.test.ts` asserts against the REAL list rather than a
 * hand-kept copy — a copy silently drifted once already, and the drifted entry reached
 * users as an empty listing.
 */
export const DATA_BROWSE_ALLOWED_ENTITIES = [
  ExtendedEntitiesTypeDict.ExperimentalSynapsesPerConnection,
  ExtendedEntitiesTypeDict.ExperimentalBoutonDensity,
  ExtendedEntitiesTypeDict.ExperimentalNeuronDensity,
  ExtendedEntitiesTypeDict.CellMorphology,
  ExtendedEntitiesTypeDict.ElectricalCellRecording,
  ExtendedEntitiesTypeDict.EFeatureExtractionResult,
  ExtendedEntitiesTypeDict.IonChannelRecording,
  ExtendedEntitiesTypeDict.SingleNeuronSynaptome,
  ExtendedEntitiesTypeDict.Memodel,
  ExtendedEntitiesTypeDict.Circuit,
  ExtendedEntitiesTypeDict.Emodel,
  ExtendedEntitiesTypeDict.MemodelCircuitSimulation,
  ExtendedEntitiesTypeDict.SingleNeuronSynaptomeSimulation,
  ExtendedEntitiesTypeDict.SingleNeuronCircuitSimulation,
  ExtendedEntitiesTypeDict.PairedNeuronCircuitSimulation,
  ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation,
  ExtendedEntitiesTypeDict.MicrocircuitSimulation,
  ExtendedEntitiesTypeDict.SingleNeuronSimulation,
  ExtendedEntitiesTypeDict.IonChannelModel,
  ExtendedEntitiesTypeDict.SingleNeuronCircuit,
  ExtendedEntitiesTypeDict.SynthesizedCellMorphology,
  ExtendedEntitiesTypeDict.SimulatableExtracellularRecordingArray,
  ExtendedEntitiesTypeDict.EMCellMesh,
  ExtendedEntitiesTypeDict.IonChannelModelSimulation,
  ExtendedEntitiesTypeDict.RegionCircuitSimulation,
  ExtendedEntitiesTypeDict.WholeBrainCircuitSimulation,
] as const;
