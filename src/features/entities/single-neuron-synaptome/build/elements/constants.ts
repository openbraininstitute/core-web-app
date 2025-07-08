export const SECTION_TARGET_MAPPING = {
  dend: 'Basal dendrites',
  soma: 'Soma',
  apic: 'Apical dendrites',
  basal: 'Basal dendrites',
  axon: 'Axon',
};

export type SectionTargetMappingKeys = keyof typeof SECTION_TARGET_MAPPING;

export const synapseTypeMapping = {
  110: 'Excitatory synapses',
  10: 'Inhibitory synapses',
};
