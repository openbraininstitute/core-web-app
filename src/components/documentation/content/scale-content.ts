export type SingleScaleTypeProps = {
  title: string;
  description: string;
  slug: string;
  image: string;
};

export type SingleScaleProps = {
  name: string;
  content: SingleScaleTypeProps[];
};

export function useScaleArchitecture(): SingleScaleProps[] {
  return [
    {
      name: 'Subcellular',
      content: [
        {
          title: 'Ion Channel',
          description:
            'Ion channels are proteins that form pores in cell membranes, allowing ions to pass through and play a crucial role in cellular signaling.',
          slug: 'ion-channel',
          image: '/images/documentation/single_scale/img-scale-ion_channel.webp',
        },
        {
          title: 'Metabolism',
          description:
            'Metabolism refers to the chemical processes that occur within a cell to maintain life, including energy production and molecular synthesis.',
          slug: 'metabolism',
          image: '/images/documentation/single_scale/img-scale-metabolism.webp',
        },
        {
          title: 'NGV Unit',
          description:
            'The NGV (Next Generation Visualization) Unit is a framework for visualizing complex biological data in a user-friendly manner.',
          slug: 'ngv-unit',
          image: '/images/documentation/single_scale/img-scale-ngv_unit.webp',
        },
      ],
    },
    {
      name: 'Cellular',
      content: [
        {
          title: 'Single Neuron',
          description:
            'A single neuron is a basic unit of the nervous system, responsible for transmitting information through electrical and chemical signals.',
          slug: 'single-neuron',
          image: '/images/documentation/single_scale/img-scale-single_neuron.webp',
        },
        {
          title: 'Synaptome',
          description:
            'The synaptome refers to the complete set of synapses in a nervous system, providing insights into neural connectivity and function.',
          slug: 'synaptome',
          image: '/images/documentation/single_scale/img-scale-synaptome.webp',
        },
        {
          title: 'Paired Neuron',
          description:
            'Paired neurons are two neurons that are connected and interact with each other, often studied to understand synaptic transmission and plasticity.',
          slug: 'paired-neuron',
          image: '/images/documentation/single_scale/img-scale-paired_neuron.webp',
        },
      ],
    },
    {
      name: 'Circuit',
      content: [
        {
          title: 'Small Microcircuit',
          description:
            'A small microcircuit is a compact network of neurons that processes information locally, often used in computational models of neural function.',
          slug: 'small-microcircuit',
          image: '/images/documentation/single_scale/img-scale-small_microcircuit.webp',
        },
        {
          title: 'Microcircuit',
          description:
            'A microcircuit is a larger network of interconnected neurons that processes information across multiple regions, providing insights into complex neural computations.',
          slug: 'microcircuit',
          image: '/images/documentation/single_scale/img-scale-microcircuit.webp',
        },
        {
          title: 'NGV Circuit',
          description:
            'The NGV Circuit is a framework for integrating and visualizing data from multiple scales of biological organization, enhancing our understanding of neural systems.',
          slug: 'ngv-circuit',
          image: '/images/documentation/single_scale/img-scale-ngv_circuit.webp',
        },
      ],
    },
    {
      name: 'System',
      content: [
        {
          title: 'Brain Region',
          description:
            'A brain region is a specific area of the brain that has distinct anatomical and functional characteristics, contributing to various cognitive and motor functions.',
          slug: 'brain-region',
          image: '/images/documentation/single_scale/img-scale-brain_region.webp',
        },
        {
          title: 'Brain System',
          description:
            'A brain system is a network of interconnected brain regions that work together to perform complex functions, such as memory, emotion, or sensory processing.',
          slug: 'brain-system',
          image: '/images/documentation/single_scale/img-scale-brain_system.webp',
        },
        {
          title: 'Whole Brain',
          description:
            'The whole brain refers to the entire organ, encompassing all its regions and systems, and is studied to understand overall brain function and behavior.',
          slug: 'whole-brain',
          image: '/images/documentation/single_scale/img-scale-whole_brain.webp',
        },
      ],
    },
  ];
}
