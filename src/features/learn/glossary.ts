/*
 * The Learn glossary: the words met on the platform, in neuroscience and in simulating it, each
 * with a one-line answer, a fuller explanation, and where on the platform it turns up. Plain data,
 * so terms can be added without touching the page.
 */

export const GLOSSARY_CATEGORIES = [
  'Neuroscience',
  'Electrophysiology',
  'Modelling',
  'Simulation',
  'Platform',
] as const;

export type GlossaryCategory = (typeof GLOSSARY_CATEGORIES)[number];

export type GlossaryTerm = {
  /** In the URL, ?term=<id>. */
  id: string;
  term: string;
  /** Other names and abbreviations it goes by. */
  aka?: string[];
  category: GlossaryCategory;
  /** The answer in one sentence. */
  short: string;
  /** More, a paragraph per string. */
  body: string[];
  /** A few numbers worth knowing, typical values rather than laws. */
  facts?: { label: string; value: string }[];
  /** Where it turns up on the platform, each a path through the menus. */
  platform?: string[][];
  /** Ids of other terms. */
  related?: string[];
};

/** Each category's colour, for its tag and dot: [text, fill]. */
import { EXTRA_TERMS } from '@/features/learn/glossary-extra';
import { MORE_TERMS } from '@/features/learn/glossary-more';

export const CATEGORY_COLOURS: Record<GlossaryCategory, [string, string]> = {
  Neuroscience: ['#003a8c', '#e6f4ff'],
  Electrophysiology: ['#ad4e00', '#fff4e6'],
  Modelling: ['#531dab', '#f4efff'],
  Simulation: ['#006d75', '#e6fffb'],
  Platform: ['#595959', '#f2f2f2'],
};

export const GLOSSARY: GlossaryTerm[] = [
  {
    id: 'neuron',
    term: 'Neuron',
    aka: ['Nerve cell'],
    category: 'Neuroscience',
    short: 'A cell that receives, integrates and passes on electrical and chemical signals.',
    body: [
      'A neuron collects input on its dendrites, adds it up across its membrane, and when the sum crosses a threshold fires an action potential down its axon to the synapses it makes with other cells.',
      'Neurons differ enormously in shape and in how they fire, which is why they are described by both a morphological type (m-type) and an electrical type (e-type).',
    ],
    facts: [
      { label: 'In a human brain', value: '≈ 86 billion' },
      { label: 'In a mouse brain', value: '≈ 70 million' },
      { label: 'Synapses each', value: '1,000 – 10,000' },
    ],
    platform: [['Data', 'Experimental', 'Morphology']],
    related: ['morphology', 'synapse', 'action-potential', 'm-type', 'e-type'],
  },
  {
    id: 'morphology',
    term: 'Morphology',
    aka: ['Neuron morphology', 'Reconstruction'],
    category: 'Neuroscience',
    short: 'The 3D shape of a neuron: its soma, dendrites and axon, traced as a tree of segments.',
    body: [
      'A morphology is usually reconstructed from a stained cell under a microscope and stored as connected points with a radius each, in formats such as SWC, ASC or H5.',
      'Shape matters for function: where synapses land on the dendritic tree, and how far signals have to travel, change how a neuron responds. Models use morphologies as the scaffold the electrical properties are placed on.',
    ],
    platform: [
      ['Data', 'Experimental', 'Morphology'],
      ['Data', 'Model', 'Synthesized morphology'],
    ],
    related: ['neuron', 'dendrite', 'axon', 'm-type', 'compartment'],
  },
  {
    id: 'dendrite',
    term: 'Dendrite',
    category: 'Neuroscience',
    short: 'The branched input side of a neuron, where most synapses arrive.',
    body: [
      'Dendrites are tapering branches that spread out from the soma. Pyramidal cells have basal dendrites around the soma and an apical dendrite that rises towards the brain surface and ends in a tuft.',
      'They are not passive cables: ion channels along them can boost, filter or even generate local spikes, so the same input can have different effects depending on where it lands.',
    ],
    related: ['morphology', 'synapse', 'axon', 'compartment'],
  },
  {
    id: 'axon',
    term: 'Axon',
    category: 'Neuroscience',
    short: 'The output cable of a neuron, carrying action potentials to its synapses.',
    body: [
      'An axon usually starts at the axon initial segment next to the soma, where action potentials begin, and can branch to reach thousands of targets, nearby or in distant brain regions.',
      'Along its branches are boutons, swellings where synapses are made; how densely they are spaced is one of the measurements used to build circuits.',
    ],
    platform: [['Data', 'Experimental', 'Bouton density']],
    related: ['action-potential', 'synapse', 'morphology'],
  },
  {
    id: 'synapse',
    term: 'Synapse',
    category: 'Neuroscience',
    short: 'The junction where one neuron passes a signal to another.',
    body: [
      'At a chemical synapse an action potential arriving at the presynaptic bouton releases neurotransmitter, which opens receptor channels on the postsynaptic cell and changes its membrane potential for a few milliseconds.',
      'Excitatory synapses (mostly glutamate) push the target towards firing; inhibitory ones (mostly GABA) hold it back. Their strength changes with use, which is how learning is thought to be stored.',
    ],
    facts: [
      { label: 'Cleft width', value: '≈ 20 nm' },
      { label: 'Delay', value: '≈ 0.5 – 2 ms' },
    ],
    platform: [['Data', 'Experimental', 'Synapse per connection']],
    related: ['neuron', 'synaptome', 'circuit'],
  },
  {
    id: 'cortical-layer',
    term: 'Cortical layer',
    aka: ['L1 – L6'],
    category: 'Neuroscience',
    short: 'One of the six bands of the neocortex, numbered from the surface down.',
    body: [
      'Each layer has its own mix of cell types and connections: layer 4 receives most input from the thalamus, layers 2/3 talk to other cortical areas, and layers 5 and 6 send output out of the cortex.',
      'Cell types are often named by their layer, so L5_TPC is a thick-tufted pyramidal cell in layer 5.',
    ],
    related: ['m-type', 'brain-region', 'circuit'],
  },
  {
    id: 'brain-region',
    term: 'Brain region',
    aka: ['Brain area', 'Atlas region'],
    category: 'Neuroscience',
    short:
      'A named part of the brain in an atlas, such as the somatosensory cortex or the hippocampus.',
    body: [
      'Atlases split the brain into a hierarchy of regions, from the whole brain down to single layers of one cortical area. The platform uses atlases such as the Allen mouse brain atlas, so that data and models can be found by where they come from.',
    ],
    platform: [['Data', 'Brain region']],
    related: ['cortical-layer', 'circuit'],
  },
  {
    id: 'membrane-potential',
    term: 'Membrane potential',
    aka: ['Vm', 'Voltage'],
    category: 'Electrophysiology',
    short: 'The voltage across a cell’s membrane, inside relative to outside.',
    body: [
      'Pumps and selective ion channels keep more potassium inside the cell and more sodium outside. The result is a resting potential with the inside negative, around −70 mV in many neurons.',
      'Input that raises it (depolarisation) brings the cell towards firing; input that lowers it (hyperpolarisation) moves it away. Almost every trace in electrophysiology is a membrane potential against time.',
    ],
    facts: [
      { label: 'Resting', value: '≈ −60 to −80 mV' },
      { label: 'Spike threshold', value: '≈ −50 mV' },
    ],
    related: ['action-potential', 'ion-channel', 'current-clamp'],
  },
  {
    id: 'action-potential',
    term: 'Action potential',
    aka: ['Spike', 'AP'],
    category: 'Electrophysiology',
    short: 'A brief all-or-nothing voltage spike that a neuron sends down its axon.',
    body: [
      'When the membrane passes threshold, voltage-gated sodium channels open and the inside swings positive within a millisecond; potassium channels then bring it back down, often below rest.',
      'Spikes are the currency of neural communication: the information is mostly in when and how often they happen, not in their shape. Firing patterns, such as bursting or adapting, are what e-types classify.',
    ],
    facts: [
      { label: 'Duration', value: '≈ 1 – 2 ms' },
      { label: 'Peak', value: '≈ +30 mV' },
    ],
    related: ['membrane-potential', 'ion-channel', 'e-type', 'hodgkin-huxley'],
  },
  {
    id: 'ion-channel',
    term: 'Ion channel',
    category: 'Electrophysiology',
    short: 'A protein pore in the membrane that lets particular ions through when it is open.',
    body: [
      'Channels are selective (for sodium, potassium, calcium, chloride…) and gated: by voltage, by a neurotransmitter binding, or by calcium inside the cell. Which channels a neuron has, and where, sets how it fires.',
      'In models each kind is described by an ion channel model, usually equations for how fast its gates open and close at each voltage, fitted to recordings.',
    ],
    platform: [
      ['Data', 'Experimental', 'Ion channel electrophysiology'],
      ['Data', 'Model', 'Ion channel model'],
      ['Workflows', 'Build', 'Ion channel model'],
    ],
    related: ['hodgkin-huxley', 'membrane-potential', 'e-model'],
  },
  {
    id: 'current-clamp',
    term: 'Current clamp',
    aka: ['Patch clamp'],
    category: 'Electrophysiology',
    short: 'Recording a cell’s voltage while injecting a chosen current into it.',
    body: [
      'With a glass electrode sealed onto the cell (patch clamp), the experimenter injects steps, ramps or noise and records how the membrane potential responds. The reverse, holding the voltage and measuring current, is voltage clamp.',
      'These traces are the raw material for e-types and for fitting electrical models; features such as spike count, latency and adaptation are extracted from them.',
    ],
    platform: [
      ['Data', 'Experimental', 'Single cell electrophysiology'],
      ['Data', 'Experimental', 'Intracellular e-feature extraction'],
    ],
    related: ['e-type', 'stimulus-protocol', 'e-model'],
  },
  {
    id: 'm-type',
    term: 'M-type',
    aka: ['Morphological type'],
    category: 'Neuroscience',
    short: 'A class of neurons that share a shape, such as layer 5 thick-tufted pyramidal cells.',
    body: [
      'M-types are named by layer and shape: L23_PC (layer 2/3 pyramidal cell), L4_SSC (spiny stellate cell), L5_TPC, and interneurons such as basket (BC) and Martinotti (MC) cells.',
      'Combined with an e-type, an m-type gives the me-type the platform uses to build neuron models.',
    ],
    related: ['e-type', 'me-model', 'morphology', 'cortical-layer'],
  },
  {
    id: 'e-type',
    term: 'E-type',
    aka: ['Electrical type'],
    category: 'Electrophysiology',
    short: 'A class of neurons that fire in the same way when stimulated.',
    body: [
      'E-types sort firing patterns: continuous adapting (cAD), continuous non-adapting (cNAC), bursting (bAC, cIR) and so on, from how a cell responds to current steps.',
      'Many interneuron m-types come in several e-types, which is why a model needs both.',
    ],
    related: ['m-type', 'me-model', 'current-clamp', 'action-potential'],
  },
  {
    id: 'hodgkin-huxley',
    term: 'Hodgkin–Huxley model',
    aka: ['HH model'],
    category: 'Modelling',
    short: 'Equations describing how voltage-gated channels make an action potential.',
    body: [
      'Hodgkin and Huxley (1952) modelled the membrane of the squid giant axon as a capacitor in parallel with sodium, potassium and leak conductances, each gated by variables that follow the voltage with their own speed.',
      'Almost every detailed neuron model is built the same way today, with many more channel types, which is why ion channel models are written as HH-style gating equations.',
    ],
    facts: [{ label: 'Nobel Prize', value: '1963' }],
    related: ['ion-channel', 'action-potential', 'compartment'],
  },
  {
    id: 'compartment',
    term: 'Compartment',
    aka: ['Segment'],
    category: 'Modelling',
    short:
      'A short piece of a neuron treated as having one voltage, the unit a model is solved in.',
    body: [
      'A detailed model chops the morphology into many small compartments, each with its own channels, joined by the resistance of the cytoplasm. Solving them together shows how signals spread and fade along dendrites and axon.',
      'A point neuron is the extreme case: the whole cell in one compartment.',
    ],
    related: ['morphology', 'hodgkin-huxley', 'neuron-simulator'],
  },
  {
    id: 'e-model',
    term: 'E-model',
    aka: ['Electrical model'],
    category: 'Modelling',
    short:
      'The set of ion channels and their densities that make a model neuron fire like an e-type.',
    body: [
      'An e-model says which channels sit in the soma, axon and dendrites and how dense they are. The densities are found by optimisation: an algorithm tries values until the model’s features match those extracted from recordings.',
    ],
    platform: [
      ['Data', 'Model', 'E-model'],
      ['Workflows', 'Optimize'],
    ],
    related: ['me-model', 'e-type', 'ion-channel', 'current-clamp'],
  },
  {
    id: 'me-model',
    term: 'ME-model',
    aka: ['Single neuron model'],
    category: 'Modelling',
    short: 'A complete model neuron: one morphology combined with one e-model.',
    body: [
      'Putting an e-model on a morphology gives a cell that can be simulated: inject current and it fires, give it synapses and it responds to input. Checking that it still behaves like its e-type on the new shape is part of building it.',
    ],
    platform: [
      ['Data', 'Model', 'ME-model'],
      ['Workflows', 'Simulate', 'Single neuron'],
    ],
    related: ['e-model', 'morphology', 'synaptome', 'circuit'],
  },
  {
    id: 'synaptome',
    term: 'Synaptome',
    category: 'Modelling',
    short: 'A single neuron model with synapses placed on it, ready to be driven by input.',
    body: [
      'Synapses are placed on the dendrites by rules, such as which part of the tree and how many, and each is given its type and dynamics. Driving them with spike trains shows how the neuron responds to realistic input rather than injected current.',
    ],
    platform: [
      ['Workflows', 'Build', 'Single neuron synaptome'],
      ['Workflows', 'Simulate', 'Synaptome'],
    ],
    related: ['me-model', 'synapse', 'circuit'],
  },
  {
    id: 'circuit',
    term: 'Circuit',
    aka: ['Microcircuit', 'Network model'],
    category: 'Modelling',
    short:
      'Many model neurons connected by synapses, from a pair of cells to a whole brain region.',
    body: [
      'A circuit is built by placing neurons at measured densities in an atlas volume, choosing their m-types and e-types, and connecting them where their axons and dendrites meet, pruned to match measured connection statistics.',
      'The platform lists circuits by size: single neuron, paired neurons, small microcircuit, microcircuit, region and whole brain.',
    ],
    platform: [
      ['Data', 'Model', 'Circuit'],
      ['Workflows', 'Extract', 'Circuit'],
      ['Workflows', 'Simulate', 'Circuit'],
    ],
    related: ['synapse', 'me-model', 'brain-region', 'simulation'],
  },
  {
    id: 'simulation',
    term: 'Simulation',
    category: 'Simulation',
    short: 'Running a model forward in time to see what it does.',
    body: [
      'A simulation takes a model, a stimulus protocol and a duration, and numerically solves the model’s equations step by step. Its outputs are recordings, voltage traces and spike times, which can be analysed like experimental data.',
      'On the platform a set of related simulations, for example one per stimulus strength, is run together as a campaign.',
    ],
    platform: [
      ['Workflows', 'Simulate'],
      ['Data', 'Simulation'],
    ],
    related: ['stimulus-protocol', 'time-step', 'neuron-simulator', 'circuit'],
  },
  {
    id: 'stimulus-protocol',
    term: 'Stimulus protocol',
    aka: ['Stimulus'],
    category: 'Simulation',
    short:
      'What is done to a model during a simulation: currents injected or spikes delivered, and when.',
    body: [
      'Protocols mirror experiments: current steps of increasing size, ramps, noise, or trains of synaptic input at a set frequency. Using the same protocols as the recordings is what makes a model comparable to them.',
    ],
    related: ['current-clamp', 'simulation'],
  },
  {
    id: 'time-step',
    term: 'Time step',
    aka: ['dt'],
    category: 'Simulation',
    short: 'How far forward in time a simulation moves each step.',
    body: [
      'Smaller steps are more accurate and slower. Detailed neuron models usually use a step of 0.025 ms, short enough to follow the fastest channels during a spike.',
    ],
    facts: [{ label: 'Typical', value: '0.025 ms' }],
    related: ['simulation', 'neuron-simulator'],
  },
  {
    id: 'neuron-simulator',
    term: 'NEURON',
    aka: ['NEURON simulator'],
    category: 'Simulation',
    short: 'The standard simulator for detailed, multi-compartment neuron models.',
    body: [
      'NEURON solves the cable equation over a model’s compartments with HH-style channels written in its NMODL language. Single neuron and circuit simulations of detailed models are typically run on NEURON or on simulators built around it.',
    ],
    related: ['compartment', 'hodgkin-huxley', 'simulation'],
  },
  {
    id: 'virtual-lab',
    term: 'Virtual lab',
    category: 'Platform',
    short: 'A shared workspace for a team, holding its projects, members and credits.',
    body: [
      'A virtual lab is where a group works together: an admin invites members and moves credits into projects. Everything you create belongs to a project within a lab.',
    ],
    platform: [['Top menu', 'Lab and project switcher']],
    related: ['project', 'credits'],
  },
  {
    id: 'project',
    term: 'Project',
    category: 'Platform',
    short:
      'A piece of work inside a virtual lab, with its own data, simulations, notebooks and credits.',
    body: [
      'Projects keep work apart: what you build, simulate or upload in one is listed under its Data, alongside the public data everyone can see.',
    ],
    platform: [['Top menu', 'Lab and project switcher']],
    related: ['virtual-lab', 'credits', 'notebook'],
  },
  {
    id: 'credits',
    term: 'Credits',
    category: 'Platform',
    short: 'What compute on the platform is paid with; each project spends its own.',
    body: [
      'Credits are transferred from a virtual lab to its projects. Running simulations, builds and other workflows spends them; the project’s balance is the pill next to the lab switcher.',
    ],
    platform: [['Top menu', 'Credits']],
    related: ['virtual-lab', 'project'],
  },
  {
    id: 'notebook',
    term: 'Notebook',
    aka: ['Jupyter notebook'],
    category: 'Platform',
    short:
      'Code, results and notes in one document, run in JupyterHub next to your project’s data.',
    body: [
      'Notebooks are for analysis the menus do not cover: load simulation results, plot them, or run your own models. Templates show common tasks and can be started from the Notebooks page.',
    ],
    platform: [['Notebooks'], ['Notebooks', 'Open JupyterHub']],
    related: ['project', 'simulation'],
  },
  ...MORE_TERMS,
  ...EXTRA_TERMS,
];

export const glossaryTerm = (id: string | null) => GLOSSARY.find((t) => t.id === id);
