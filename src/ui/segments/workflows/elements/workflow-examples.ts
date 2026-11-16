import { ExtendedEntitiesTypeDict as D } from '@/api/entitycore/types/extended-entity-type';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

/** A public entity a workflow can start from, already chosen: a circuit for a simulation, a morphology to build on. */
export interface IWorkflowExample {
  id: string;
  name: string;
  /** Where it is from: its brain region and species, where it has them. */
  about: string;
  /** The type the workflow's selection lists it as, which the configure URL needs. */
  entityType: TExtendedEntitiesTypeDict;
}

const examples = (entityType: TExtendedEntitiesTypeDict, rows: [id: string, name: string, about: string][]) =>
  rows.map(([id, name, about]): IWorkflowExample => ({ id, name, about, entityType }));

/**
 * Each workflow type's examples, hard-coded for the prototype so they show at once: staging's public entities, the
 * first few unlike ones its selection page lists (2026-11-13). None for the types whose selection lists campaigns
 * (ME-model building, e-model optimisation).
 */
export const WORKFLOW_EXAMPLES: Partial<Record<TExtendedEntitiesTypeDict, IWorkflowExample[]>> = {
  [D.IonChannelBuildCampaign]: examples(D.IonChannelRecording, [
    ["30c4b755-83b1-4942-85c3-c00b210f5836", "rCell25437", "Rattus norvegicus"],
    ["de7d6ef0-678c-4287-9dfe-9218026b5da1", "rCell25609", "Rattus norvegicus"],
    ["d0e747a0-462f-4635-97fc-d54c67b2fb68", "rCell25635", "Rattus norvegicus"],
  ]),
  [D.BuildSynaptomeCampaign]: examples(D.Memodel, [
    ["9f521816-d2f5-4257-bf77-7da1de301063", "MEM__jy180314_B_idA__dNAD_ltb_VPM_TC", "Thalamus"],
    ["6191ce4f-a132-4b80-a622-1e9f0c570869", "MEM__jy180321_B_idA__dAD_ltb_Rt_RC", "Thalamus"],
    ["1355dc9c-753b-4a24-a1fc-749f7a5fbe50", "MEM__04531-04540-X11803-Y13470_final__cNAD_noscltb_Rt_RC", "Thalamus"],
  ]),
  [D.EmSynapseMappingCampaign]: examples(D.UniversalCellMorphology, [
    ["23df738f-6666-4377-bce2-20ebd05351bb", "dend-Fluo41_right_axon-tkb061101a2_ch6_cc2_h_zk_60x_1_-_Scale_x1.000_y0.975_z1.000_-_Clone_0", "Primary somatosensory area, hindlimb representation, layer 6 · Rattus norvegicus"],
    ["11a19e32-1865-461c-aa02-76af64cf94c6", "dend-Fluo41_right_axon-rat_20160316_E1_LH1_cell1_-_Scale_x1.000_y0.950_z1.000_-_Clone_1", "Primary somatosensory area, hindlimb representation, layer 6 · Rattus norvegicus"],
    ["12d6b5e7-deff-471a-9d55-ee84e70e63d0", "dend-Fluo41_right_axon-rat_20160315_E2_LH3_cell1_-_Scale_x1.000_y1.050_z1.000", "Primary somatosensory area, hindlimb representation, layer 6 · Rattus norvegicus"],
  ]),
  [D.ExtracellularRecordingArrayCampaign]: examples(D.Circuit, [
    ["7635d7e5-1108-4fff-92bf-fdb70583677a", "SSCx hex0 30-cell L2/L3 strongly-recurrent sub-circuit v3 (recurrent OFF) [fix: shared mechanisms_dir]", "Cerebral Cortex · Rattus norvegicus"],
    ["d422ed2e-18f8-4e41-992a-617f4e990557", "nbS1-Cylinder-Hex0-0.045-sub30", "Cerebral Cortex · Rattus norvegicus"],
    ["9b34ebe8-b595-4e89-968e-40ab9d7ec72b", "BBP thalamoreticular circuit", "Ventral posterolateral nucleus of the thalamus · Mus musculus"],
  ]),
  [D.CircuitSynapticPhysiologyCampaign]: examples(D.Circuit, [
    ["7635d7e5-1108-4fff-92bf-fdb70583677a", "SSCx hex0 30-cell L2/L3 strongly-recurrent sub-circuit v3 (recurrent OFF) [fix: shared mechanisms_dir]", "Cerebral Cortex · Rattus norvegicus"],
    ["d422ed2e-18f8-4e41-992a-617f4e990557", "nbS1-Cylinder-Hex0-0.045-sub30", "Cerebral Cortex · Rattus norvegicus"],
    ["9b34ebe8-b595-4e89-968e-40ab9d7ec72b", "BBP thalamoreticular circuit", "Ventral posterolateral nucleus of the thalamus · Mus musculus"],
  ]),
  [D.IonChannelModelSimulation]: examples(D.IonChannelModel, [
    ["eb971883-1ad5-4d23-a98b-9f080843977c", "Kv3.2", "Cricetulus griseus"],
    ["dee9af23-b899-4937-a20c-de7f2571261c", "HCN3", "Basic cell groups and regions · Mus musculus"],
    ["44cf09b4-c4bb-4dcb-9b1d-dda2c600a104", "HCN2", "Basic cell groups and regions · Mus musculus"],
  ]),
  [D.MemodelCircuitSimulation]: examples(D.MemodelCircuit, [
    ["9f521816-d2f5-4257-bf77-7da1de301063", "MEM__jy180314_B_idA__dNAD_ltb_VPM_TC", "Thalamus"],
    ["6191ce4f-a132-4b80-a622-1e9f0c570869", "MEM__jy180321_B_idA__dAD_ltb_Rt_RC", "Thalamus"],
    ["1355dc9c-753b-4a24-a1fc-749f7a5fbe50", "MEM__04531-04540-X11803-Y13470_final__cNAD_noscltb_Rt_RC", "Thalamus"],
  ]),
  [D.SingleNeuronCircuitSimulation]: examples(D.SingleNeuronCircuit, [
    ["82bae430-aff9-46b1-8ce7-e616bc733ed2", "nbS1-O1__202247__cADpyr__L5_TPC_A", "Primary somatosensory area, hindlimb representation · Rattus norvegicus"],
    ["98f1fbf0-89d8-42bf-9978-2e8183dccef0", "nbS1-O1__188401__cADpyr__L5_TPC_B", "Primary somatosensory area, hindlimb representation · Rattus norvegicus"],
    ["baf9361f-4600-42d1-bacc-280779138386", "nbS1-O1__178969__cSTUT__L5_NBC", "Primary somatosensory area, hindlimb representation · Rattus norvegicus"],
  ]),
  [D.PairedNeuronCircuitSimulation]: examples(D.PairedNeuronCircuit, [
    ["ed71babb-899b-47b0-a77c-3aeed1790c91", "nbS1-O1-ErcSst-maxNsyn-HEX0-L6__staging-20260811-123828", "Primary somatosensory area, hindlimb representation · Rattus norvegicus"],
    ["655755c8-a05d-4e06-ab32-4758a9738707", "nbS1-O1-ErcSst-maxNsyn-HEX0-L6__staging-20260811-123450", "Primary somatosensory area, hindlimb representation · Rattus norvegicus"],
    ["8296b057-a0a0-41dc-86de-f64f6b8c0936", "nbS1-O1-ErcSst-maxNsyn-HEX0-L6__staging-20260811-110107", "Primary somatosensory area, hindlimb representation · Rattus norvegicus"],
  ]),
  [D.SmallMicrocircuitSimulation]: examples(D.SmallMicrocircuit, [
    ["2f5a9c57-2fb2-4716-8bb0-2044c87a831b", "nbS1-HEX0-L1__[TEST]-10-Neuron-Extraction", "Primary somatosensory area, hindlimb representation · Rattus norvegicus"],
    ["061c4b02-8c91-4b13-b2a7-74697c5083db", "rCA1-CYLINDER-REF-1PC-8PV-10", "Cornu ammonis 1 · Rattus norvegicus"],
    ["51fd0040-7d0e-424f-b8d9-87cd28321081", "rCA1-CYLINDER-REF-1PC-8PV-09", "Cornu ammonis 1 · Rattus norvegicus"],
  ]),
  [D.MicrocircuitSimulation]: examples(D.Microcircuit, [
    ["7635d7e5-1108-4fff-92bf-fdb70583677a", "SSCx hex0 30-cell L2/L3 strongly-recurrent sub-circuit v3 (recurrent OFF) [fix: shared mechanisms_dir]", "Cerebral Cortex · Rattus norvegicus"],
    ["d422ed2e-18f8-4e41-992a-617f4e990557", "nbS1-Cylinder-Hex0-0.045-sub30", "Cerebral Cortex · Rattus norvegicus"],
    ["9b34ebe8-b595-4e89-968e-40ab9d7ec72b", "BBP thalamoreticular circuit", "Ventral posterolateral nucleus of the thalamus · Mus musculus"],
  ]),
  [D.WholeBrainCircuitSimulation]: examples(D.WholeBrain, [
    ["17059d8c-a74d-42f5-b3b0-285fc4e740f2", "BANC-v888-Brian2-LIF-v1", "Drosophila melanogaster"],
    ["17ebb332-480b-46e3-9d70-2bc88c836c81", "MaleCNS-v1.0-Brian2-LIF-v1", "Drosophila melanogaster"],
    ["e3cfde75-284c-434e-91c5-dd0e606dbf43", "FlyWire-v783-Brian2-LIF", "Drosophila melanogaster"],
  ]),
  [D.EFeatureExtractionCampaign]: examples(D.ElectricalCellRecording, [
    ["0b952fa9-efad-44a2-bdf9-fef732af6702", "sub-X2020-03-02-2020-03-02-0023_icephys", "Area Te 2.1 (STG)-Layer V · Homo sapiens"],
    ["ee4918be-fae2-43d4-99fc-61fea360af0c", "sub-X2020-01-28-2020-01-28-0029_icephys", "Area Te 2.1 (STG)-Layer V · Homo sapiens"],
    ["bdba2c48-df47-4bd9-bbfe-e4ec2c6a5abe", "sub-X2020-01-28-2020-01-28-0017_icephys", "Area Te 2.1 (STG)-Layer V · Homo sapiens"],
  ]),
  [D.SkeletonizationCampaign]: examples(D.EMCellMesh, [
    ["bd25e031-e669-41f3-bf16-bf06d62e8cbc", "h01_v20210601_7052969349", "temporal lobe · Homo sapiens"],
    ["dd4f2862-9b8e-4d1a-8197-62fd73c3bc25", "h01_v20210601_3680152874", "temporal lobe · Homo sapiens"],
    ["e3588b44-c479-4f33-917c-78f8cbbe2fd6", "h01_v20210601_2889815798", "temporal lobe · Homo sapiens"],
  ]),
};
