export const SECTION_TARGET_MAPPING = {
  apic: 'Apical dendrites',
  axon: 'Axon',
  basal: 'Basal dendrites',
  dend: 'Basal dendrites',
  myelin: 'Myelin',
  soma: 'Soma',
};

export type SectionTargetMappingKeys = keyof typeof SECTION_TARGET_MAPPING;

export const synapseTypeMapping = {
  110: 'Excitatory synapses',
  10: 'Inhibitory synapses',
};
