import type { Slide } from '@/features/learn/components/walkthrough/Walkthrough';

/**
 * The cortex's kinds of neuron: the 26 of the rat's somatosensory cortex, one
 * real cell of each — their families, shapes and layers; the pyramidal cells
 * layer by layer; the interneurons and the parts of the pyramidal cell each
 * aims at; how they fire; their genes; and the microcircuit they make.
 */
export const CORTICAL_CELLS_SLIDES: Slide[] = [
  {
    say: 'The cortex is built from many different kinds of neuron',
    note: "Here are 26 of them: one real cell of each kind found in the rat's somatosensory cortex, reconstructed in 3D.",
    widget: 'kinds',
  },
  {
    say: 'They fall into two families: excitatory and inhibitory',
    note: 'Excitatory cells release glutamate, pushing the neurons they contact towards firing; inhibitory interneurons release GABA, holding them back. Here, 87% of neurons are excitatory.',
    widget: 'families',
  },
  {
    say: 'Each kind is recognised first by its shape',
    note: 'Excitatory kinds mostly by their dendrites, which collect their inputs; inhibitory kinds mostly by their axons, which decide where their inhibition lands.',
    widget: 'shape',
  },
  {
    say: 'The cortex is organised in six layers, each with its own mix of neurons',
    note: "About 2 mm deep in the rat, from layer 1 just under the brain's surface down to layer 6 above the white matter. Layers 2 and 3 are often taken together. Cells and layers are drawn to scale.",
    widget: 'layers',
  },
  {
    say: "Pyramidal cells are the cortex's main excitatory neurons",
    note: 'Basal dendrites spread around a pyramid-shaped soma, and an apical dendrite climbs towards the surface, ending in a tuft. The axon starts at the axon initial segment, where spikes are triggered.',
    widget: 'pyramidal',
  },
  {
    say: 'Layer 2/3 pyramidal cells connect the cortex together',
    note: 'Their axons spread sideways through their own layer, down to layer 5, and out to other cortical areas, including those in the other hemisphere.',
    widget: 'l23',
  },
  {
    say: 'Layer 4 receives the main input from the senses, relayed by the thalamus',
    note: 'Its spiny stellate cells, star-shaped with no apical dendrite, pass that input up to layer 2/3.',
    widget: 'l4',
  },
  {
    say: "Layer 5 sends the cortex's output to the rest of the brain",
    note: 'Its thick-tufted pyramidal cells, the largest, project to the thalamus, brainstem and spinal cord. In adult animals they can fire bursts of spikes when inputs to their tuft and their soma coincide.',
    widget: 'l5',
  },
  {
    say: 'Layer 6 sends feedback to the thalamus',
    note: 'Many of its pyramidal cells project back to the thalamus that feeds the cortex, adjusting the input it receives. Others, some inverted or bipolar, connect to other cortical areas.',
    widget: 'l6',
  },
  {
    say: 'Inhibitory interneurons are fewer, but far more varied',
    note: '15 of the 26 kinds. Found in every layer, most keep their axons close to home, shaping the activity of the pyramidal cells around them.',
    widget: 'interneurons',
  },
  {
    say: "Basket cells wrap the pyramidal cell's soma in inhibition",
    note: 'They are about half of all interneurons. Most carry the protein parvalbumin and fire fast without tiring, controlling when pyramidal cells fire and pacing fast gamma rhythms.',
    widget: 'basket',
  },
  {
    say: 'Chandelier cells target only the axon initial segment',
    note: "Their boutons line up in rows, like candles, along the spot where a pyramidal cell's spikes begin. One chandelier cell can reach hundreds of pyramidal cells.",
    widget: 'chandelier',
  },
  {
    say: 'Martinotti cells inhibit the far ends of the dendrites',
    note: "Their axons climb to layer 1 and spread over the pyramidal cells' tufts. Carrying somatostatin, they are recruited more strongly the faster pyramidal cells fire, reining in runaway excitation.",
    widget: 'martinotti',
  },
  {
    say: 'Double bouquet, bitufted and bipolar cells reach up and down the column',
    note: 'Their narrow axons inhibit dendrites along a thin vertical strip. Many carry VIP and inhibit other interneurons instead, releasing pyramidal cells from inhibition.',
    widget: 'vertical',
  },
  {
    say: 'Neurogliaform cells inhibit everything around them at once',
    note: 'A small, dense cloud of fine axon releases GABA into the space between cells rather than at individual synapses, producing slow, widespread inhibition.',
    widget: 'neurogliaform',
  },
  {
    say: 'Layer 1 has few neurons of its own, all of them inhibitory',
    note: 'It is mostly the tufts of pyramidal cells below, and axons arriving from other areas and the thalamus. Its six kinds of interneuron control which of those inputs reach the tufts.',
    widget: 'layer1',
  },
  {
    say: 'Each kind of interneuron targets its own part of the pyramidal cell',
    note: 'Inhibition at the tuft shapes what a pyramidal cell takes in; at the soma, when it fires; and at the axon initial segment, whether it fires at all.',
    widget: 'targets',
  },
  {
    say: 'Neurons also differ in how they fire',
    note: 'Inject the same steady current into each and it answers with a pattern of spikes of its own. These are real recordings.',
    widget: 'firing',
  },
  {
    say: 'Their firing patterns fall into 11 electrical types',
    note: 'Each is named by how it starts (continuous, bursting or delayed) and how it carries on. Pyramidal cells all adapt, slowing down as the current goes on.',
    widget: 'named',
  },
  {
    say: 'The same shape can fire in different ways',
    note: 'Most kinds of interneuron show several firing types. Combining the 55 layer-specific shapes with the 11 firing types gives 207 morpho-electrical types.',
    widget: 'several',
  },
  {
    say: 'Genes tell neuron types apart too',
    note: 'Most interneurons carry one of three markers: parvalbumin, somatostatin, or a serotonin receptor that VIP cells also carry. Reading every gene in single cells now splits the cortex into over 100 types.',
    widget: 'genes',
  },
  {
    say: 'Together, these neurons form the cortical microcircuit',
    note: "Placed at their real densities, about 31,000 neurons make 37 million synapses in a third of a cubic millimetre: the Blue Brain Project's digital reconstruction of it can be simulated.",
    widget: 'circuit',
  },
  {
    say: "Next, let's see how these neurons communicate",
    widget: 'circuit',
    cta: { course: 'brain-modeling', label: 'Introduction to brain modeling' },
  },
];
