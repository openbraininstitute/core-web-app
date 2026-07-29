import { EntityTypeDict } from '@/api/entitycore/types/entity-type';

export const ExtendedEntitiesTypeDict = {
  ...EntityTypeDict,
  SmallMicrocircuit: 'small_micro_circuit',
  Microcircuit: 'micro_circuit',
  PairedNeuronCircuit: 'paired_neuron_circuit',
  MemodelCircuit: 'me_model_circuit',
  MemodelCircuitSimulation: 'me_model_circuit_simulation',
  SingleNeuronCircuitSimulation: 'single_neuron_circuit_simulation',
  PairedNeuronCircuitSimulation: 'paired_neuron_circuit_simulation',
  SmallMicrocircuitSimulation: 'small_microcircuit_simulation',
  MicrocircuitSimulation: 'microcircuit_simulation',
  IonChannelModelSimulation: 'ion_channel_model_simulation',
  NGVCircuit: 'ngv_circuit',
  BrainRegion: 'brain_region',
  BrainSystems: 'brain_system',
  WholeBrain: 'whole_brain',
  Metabolism: 'metabolism',
  NGVUnit: 'ngv_unit',
  SingleNeuronCircuit: 'single_neuron_circuit',
  SynthesizedCellMorphology: 'synthesized_cell_morphology',
  UniversalCellMorphology: 'universal_cell_morphology',
  CircuitExtractionCampaign: 'circuit_extraction_campaign',
  SkeletonizationCampaign: 'skeletonization_campaign',
  ExtracellularRecordingArrayCampaign: 'extracellular_recording_array_campaign',
  RegionCircuitSimulation: 'region_circuit_simulation',
  WholeBrainCircuitSimulation: 'whole_brain_circuit_simulation',
} as const;

export type TExtendedEntitiesTypeDict =
  (typeof ExtendedEntitiesTypeDict)[keyof typeof ExtendedEntitiesTypeDict];

/** simulations under Data → Simulations (kept in sync with `SimulationEntitiesTileTypes`). */
const DATA_SIMULATION_LISTING_EXTENDED_TYPES: ReadonlySet<TExtendedEntitiesTypeDict> = new Set([
  ExtendedEntitiesTypeDict.SingleNeuronSimulation,
  ExtendedEntitiesTypeDict.SingleNeuronSynaptomeSimulation,
  ExtendedEntitiesTypeDict.MemodelCircuitSimulation,
  ExtendedEntitiesTypeDict.SingleNeuronCircuitSimulation,
  ExtendedEntitiesTypeDict.PairedNeuronCircuitSimulation,
  ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation,
  ExtendedEntitiesTypeDict.MicrocircuitSimulation,
  ExtendedEntitiesTypeDict.IonChannelModelSimulation,
  ExtendedEntitiesTypeDict.RegionCircuitSimulation,
  ExtendedEntitiesTypeDict.WholeBrainCircuitSimulation,
]);

/**
 * when true, the data browse listing and sidebar counts constrain results using the workspace
 * brain-region hierarchy (single-species mode)
 * only single-neuron simulations use that hierarchy
 * other simulation listings are scoped by workspace (public/project) only
 */
export function dataBrowseListingUsesBrainRegionHierarchy(extendedType: TExtendedEntitiesTypeDict) {
  // a task result carries no brain region column of its own -- what it shows is copied from the
  // recordings it was derived from -- so constraining the query by the hierarchy finds nothing
  if (extendedType === ExtendedEntitiesTypeDict.EFeatureExtractionResult) {
    return false;
  }

  if (DATA_SIMULATION_LISTING_EXTENDED_TYPES.has(extendedType)) {
    return (
      extendedType === ExtendedEntitiesTypeDict.SingleNeuronSimulation ||
      extendedType === ExtendedEntitiesTypeDict.SingleNeuronSynaptomeSimulation
    );
  }
  return true;
}
