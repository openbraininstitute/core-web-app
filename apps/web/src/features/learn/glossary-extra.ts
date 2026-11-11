/*
 * The third set of Learn glossary terms. glossary.ts puts them in GLOSSARY.
 */

import type { GlossaryTerm } from '@/features/learn/glossary';

export const EXTRA_TERMS: GlossaryTerm[] = [
  // Neuroscience
  {
    id: 'myelin',
    term: 'Myelin',
    aka: ['Node of Ranvier'],
    category: 'Neuroscience',
    short: 'A fatty sheath wrapped around axons that makes action potentials travel much faster.',
    body: [
      'Myelin insulates the axon in segments, leaving short gaps called nodes of Ranvier. The spike jumps from node to node instead of creeping along, which is many times faster and cheaper in energy.',
      'It is made by oligodendrocytes in the brain. Losing it, as in multiple sclerosis, slows or blocks signals.',
    ],
    facts: [
      { label: 'Myelinated speed', value: 'up to ≈ 100 m/s' },
      { label: 'Unmyelinated', value: '≈ 0.5 – 2 m/s' },
    ],
    related: ['axon', 'action-potential', 'glia', 'white-matter'],
  },
  {
    id: 'axon-initial-segment',
    term: 'Axon initial segment',
    aka: ['AIS'],
    category: 'Neuroscience',
    short:
      'The first stretch of the axon, packed with sodium channels, where action potentials usually start.',
    body: [
      'Its high density of sodium channels gives it the lowest threshold in the cell, so it decides whether the neuron fires. Chandelier cells target it specifically, giving them strong control over a pyramidal cell’s output.',
      'Detailed models often replace the reconstructed axon with a short, standard AIS-like stub, because axons are rarely reconstructed in full.',
    ],
    related: ['axon', 'action-potential', 'chandelier-cell', 'sodium-channel'],
  },
  {
    id: 'white-matter',
    term: 'Grey and white matter',
    aka: ['White matter', 'Grey matter'],
    category: 'Neuroscience',
    short:
      'Grey matter holds neurons’ bodies and synapses; white matter is the myelinated cabling between areas.',
    body: [
      'The cortex is grey matter. Beneath it, white matter carries long-range axons between cortical areas and to the rest of the brain, its colour coming from the fat in myelin.',
    ],
    related: ['myelin', 'neocortex', 'axon'],
  },
  {
    id: 'cortical-column',
    term: 'Cortical column',
    aka: ['Minicolumn', 'Barrel'],
    category: 'Neuroscience',
    short:
      'A vertical cylinder through all six layers of cortex whose cells respond to similar input.',
    body: [
      'Neurons stacked above each other through the layers tend to share what they respond to, such as one whisker in the rat barrel cortex. The column, about half a millimetre across, was the unit the first detailed neocortical microcircuit models were built at.',
    ],
    facts: [{ label: 'Width', value: '≈ 0.3 – 0.5 mm' }],
    related: ['cortical-layer', 'somatosensory-cortex', 'circuit'],
  },
  {
    id: 'basket-cell',
    term: 'Basket cell',
    aka: ['BC', 'LBC', 'NBC', 'SBC'],
    category: 'Neuroscience',
    short: 'An inhibitory interneuron whose axon wraps the somata of its targets like a basket.',
    body: [
      'By inhibiting right at the soma, basket cells can veto a pyramidal cell’s firing. Many are parvalbumin-positive and fast-spiking. In cortical models they come as large, nest and small basket cells (LBC, NBC, SBC).',
    ],
    related: ['interneuron', 'm-type', 'excitation-inhibition'],
  },
  {
    id: 'martinotti-cell',
    term: 'Martinotti cell',
    aka: ['MC'],
    category: 'Neuroscience',
    short:
      'An inhibitory interneuron that sends its axon up to layer 1 to inhibit distal dendrites.',
    body: [
      'Martinotti cells are usually somatostatin-positive. Their synapses on the far dendritic tufts of pyramidal cells control how those cells integrate input from other areas. They often facilitate: their effect grows over a train of spikes.',
    ],
    related: ['interneuron', 'pyramidal-cell', 'synaptic-plasticity', 'cortical-layer'],
  },
  {
    id: 'chandelier-cell',
    term: 'Chandelier cell',
    aka: ['ChC'],
    category: 'Neuroscience',
    short:
      'An interneuron whose axon ends in rows of boutons on pyramidal cells’ axon initial segments.',
    body: [
      'The vertical rows of boutons look like candles on a chandelier. Sitting where spikes begin, chandelier cells have unusually direct control over whether their targets fire.',
    ],
    related: ['axon-initial-segment', 'interneuron', 'pyramidal-cell'],
  },
  {
    id: 'spiny-stellate-cell',
    term: 'Spiny stellate cell',
    aka: ['SSC'],
    category: 'Neuroscience',
    short: 'A star-shaped excitatory neuron in layer 4 that receives input from the thalamus.',
    body: [
      'Unlike pyramidal cells, spiny stellates have no long apical dendrite; their dendrites stay within layer 4, where thalamic axons arrive. They pass sensory input on to the other layers of their column.',
    ],
    related: ['thalamus', 'cortical-layer', 'pyramidal-cell', 'm-type'],
  },
  {
    id: 'cerebellum',
    term: 'Cerebellum',
    aka: ['Purkinje cell'],
    category: 'Neuroscience',
    short: 'The brain structure at the back of the head that refines movement and timing.',
    body: [
      'The cerebellum holds more neurons than the rest of the brain together, most of them tiny granule cells. Its Purkinje cells have huge, flat dendritic trees receiving up to a couple of hundred thousand synapses each and are a classic target for detailed models.',
    ],
    facts: [{ label: 'Share of the brain’s neurons', value: '≈ 80 %' }],
    related: ['brain-region', 'dendrite', 'neuron'],
  },
  {
    id: 'striatum',
    term: 'Striatum',
    aka: ['Basal ganglia', 'Medium spiny neuron'],
    category: 'Neuroscience',
    short: 'The main input of the basal ganglia, involved in choosing actions and in reward.',
    body: [
      'Most of its neurons are inhibitory medium spiny neurons, driven by the cortex and modulated by dopamine. Its circuits are affected in Parkinson’s and Huntington’s disease.',
    ],
    related: ['neuromodulation', 'brain-region', 'interneuron'],
  },
  {
    id: 'receptor',
    term: 'Receptor',
    aka: ['AMPA', 'NMDA', 'GABA-A', 'GABA-B'],
    category: 'Neuroscience',
    short:
      'A protein on the postsynaptic membrane that opens or signals when neurotransmitter binds.',
    body: [
      'Fast excitatory synapses use AMPA receptors, which open quickly, and NMDA receptors, which are slower and only conduct when the cell is already depolarised, making them detectors of coincident activity and key to plasticity. Inhibitory synapses use fast GABA-A and slow GABA-B receptors.',
      'Synapse models give each receptor type its own rise and decay times.',
    ],
    facts: [
      { label: 'AMPA decay', value: '≈ 2 – 5 ms' },
      { label: 'NMDA decay', value: '≈ 50 – 100 ms' },
    ],
    related: ['synapse', 'neurotransmitter', 'synapse-model', 'synaptic-plasticity'],
  },
  {
    id: 'gap-junction',
    term: 'Gap junction',
    aka: ['Electrical synapse'],
    category: 'Neuroscience',
    short: 'A direct channel between two cells that lets current pass from one to the other.',
    body: [
      'Unlike chemical synapses, gap junctions are instant and work both ways. They are common between some interneurons of the same type, helping them fire in synchrony.',
    ],
    related: ['synapse', 'interneuron', 'oscillation'],
  },
  {
    id: 'neuromodulation',
    term: 'Neuromodulation',
    aka: ['Neuromodulator'],
    category: 'Neuroscience',
    short: 'Slow, widespread chemical signals that change how neurons and synapses behave.',
    body: [
      'Dopamine, serotonin, acetylcholine and noradrenaline are released broadly from a few small nuclei. Rather than carrying fast messages, they shift excitability, synaptic strength and plasticity, changing a circuit’s state, for example between sleep and wakefulness.',
    ],
    related: ['neurotransmitter', 'striatum', 'synaptic-plasticity'],
  },
  {
    id: 'in-vitro',
    term: 'In vivo and in vitro',
    aka: ['Brain slice', 'Ex vivo'],
    category: 'Neuroscience',
    short: 'In a living animal, or in tissue kept alive outside it, such as a brain slice.',
    body: [
      'Many cell recordings and reconstructions come from acute brain slices, a few hundred micrometres thick, kept alive for hours. Slices are easy to reach with electrodes but lose long-range connections and are often from young animals, which models have to bear in mind.',
    ],
    related: ['current-clamp', 'in-silico', 'species'],
  },
  {
    id: 'species',
    term: 'Species',
    aka: ['Mouse', 'Rat', 'Human'],
    category: 'Neuroscience',
    short: 'Which animal data or a model comes from, most often mouse, rat or human.',
    body: [
      'Brains differ between species in size, cell types and properties, so data are labelled by species and usually by age too. On the platform you can choose a species, and data and atlases follow that choice.',
    ],
    platform: [['Data', 'Brain region', 'Species']],
    related: ['atlas', 'brain-region', 'in-vitro'],
  },

  // Electrophysiology
  {
    id: 'membrane-capacitance',
    term: 'Membrane capacitance',
    aka: ['Cm'],
    category: 'Electrophysiology',
    short: 'The membrane’s ability to store charge, which makes its voltage change gradually.',
    body: [
      'The thin lipid membrane separates charge like a capacitor. Before the voltage can move, that charge has to be added or removed, so input is smoothed over time. Together with membrane resistance it sets the time constant.',
    ],
    facts: [{ label: 'Specific capacitance', value: '≈ 1 µF/cm²' }],
    related: ['membrane-potential', 'time-constant', 'input-resistance'],
  },
  {
    id: 'time-constant',
    term: 'Membrane time constant',
    aka: ['τm', 'Tau'],
    category: 'Electrophysiology',
    short: 'How quickly a neuron’s voltage settles after its input changes.',
    body: [
      'It is the time to cover about 63 % of the way to the new steady value. A longer time constant lets the cell add up inputs spread further apart in time.',
    ],
    facts: [{ label: 'Typical', value: '≈ 10 – 30 ms' }],
    related: ['membrane-capacitance', 'input-resistance', 'postsynaptic-potential'],
  },
  {
    id: 'threshold',
    term: 'Spike threshold',
    aka: ['Threshold'],
    category: 'Electrophysiology',
    short: 'The membrane potential at which an action potential takes off.',
    body: [
      'Above it, sodium channels open faster than potassium channels can counter them, and the spike becomes unstoppable. It is not a fixed value: it shifts with how fast the voltage rises and with recent firing.',
    ],
    facts: [{ label: 'Typical', value: '≈ −55 to −45 mV' }],
    related: ['action-potential', 'sodium-channel', 'rheobase'],
  },
  {
    id: 'refractory-period',
    term: 'Refractory period',
    category: 'Electrophysiology',
    short:
      'The moment after a spike during which a neuron cannot fire, or fires only with difficulty.',
    body: [
      'In the absolute refractory period sodium channels are still inactivated and no input can trigger a spike; in the relative period a stronger input can. It caps the maximum firing rate and makes spikes travel only forward along the axon.',
    ],
    facts: [{ label: 'Absolute', value: '≈ 1 – 2 ms' }],
    related: ['action-potential', 'sodium-channel', 'firing-rate'],
  },
  {
    id: 'ahp',
    term: 'Afterhyperpolarisation',
    aka: ['AHP'],
    category: 'Electrophysiology',
    short: 'The dip below resting potential that follows an action potential.',
    body: [
      'Potassium channels that stay open after the spike pull the voltage below rest. Fast AHPs last milliseconds; slow ones, carried by calcium-activated potassium channels, can last seconds and cause adaptation. AHP depth and duration are common e-features.',
    ],
    related: ['action-potential', 'potassium-channel', 'adaptation', 'e-feature'],
  },
  {
    id: 'adaptation',
    term: 'Spike frequency adaptation',
    aka: ['Adaptation'],
    category: 'Electrophysiology',
    short: 'A neuron firing more slowly over a sustained input.',
    body: [
      'Given a steady current, many pyramidal cells start fast and slow down, as slow potassium currents build up. Whether a cell adapts is one of the main distinctions between e-types, the “AD” in cADpyr, as against non-adapting “NAC”.',
    ],
    related: ['e-type', 'ahp', 'firing-rate', 'e-feature'],
  },
  {
    id: 'bursting',
    term: 'Bursting',
    aka: ['Burst'],
    category: 'Electrophysiology',
    short: 'Firing a quick cluster of spikes, then pausing.',
    body: [
      'Bursts are usually driven by calcium currents that give a longer depolarisation on which several sodium spikes ride. Some layer 5 pyramidal cells and many thalamic cells burst, and bursting e-types are named with a “b”, as in bAC or bNAC.',
    ],
    related: ['e-type', 'calcium-channel', 'thalamus', 'action-potential'],
  },
  {
    id: 'sodium-channel',
    term: 'Sodium channel',
    aka: ['Nav', 'NaT', 'NaP'],
    category: 'Electrophysiology',
    short: 'A voltage-gated channel that lets sodium in and drives the rising phase of the spike.',
    body: [
      'Transient sodium channels (NaT) open within a fraction of a millisecond on depolarisation and then inactivate; a persistent component (NaP) stays open and boosts excitability below threshold. They are densest in the axon initial segment.',
    ],
    related: ['ion-channel', 'action-potential', 'axon-initial-segment', 'threshold'],
  },
  {
    id: 'potassium-channel',
    term: 'Potassium channel',
    aka: ['Kv', 'SK', 'Kdr'],
    category: 'Electrophysiology',
    short: 'A channel that lets potassium out, repolarising the cell and shaping its firing.',
    body: [
      'There are many kinds: delayed rectifiers end each spike, A-type currents delay firing, M-currents and calcium-activated SK and BK channels cause afterhyperpolarisation and adaptation. Their mix is a large part of what makes e-types differ.',
    ],
    related: ['ion-channel', 'ahp', 'adaptation', 'reversal-potential'],
  },
  {
    id: 'calcium-channel',
    term: 'Calcium channel',
    aka: ['Cav', 'CaHVA', 'CaLVA'],
    category: 'Electrophysiology',
    short:
      'A voltage-gated channel that lets calcium in, both as current and as a chemical signal.',
    body: [
      'Calcium entry depolarises the cell, can drive bursts and dendritic spikes, and triggers transmitter release at synapses. Inside the cell it switches on calcium-activated potassium channels and plasticity, so models often track internal calcium concentration too.',
    ],
    related: ['ion-channel', 'bursting', 'potassium-channel', 'synaptic-plasticity'],
  },
  {
    id: 'ih',
    term: 'Ih',
    aka: ['HCN', 'h-current', 'Sag'],
    category: 'Electrophysiology',
    short: 'A current that switches on when a neuron is hyperpolarised and pulls it back up.',
    body: [
      'Carried by HCN channels, it produces the “sag” seen when a negative current step is applied: the voltage drops, then partly recovers. It is dense in the distal dendrites of pyramidal cells, where it shortens and evens out the effect of synaptic input.',
    ],
    related: ['ion-channel', 'membrane-potential', 'e-feature', 'dendrite'],
  },
  {
    id: 'whole-cell',
    term: 'Whole-cell recording',
    aka: ['Patch pipette'],
    category: 'Electrophysiology',
    short:
      'A patch clamp configuration in which the pipette opens into the cell, giving electrical access to its inside.',
    body: [
      'After a tight seal, a little suction breaks the membrane under the pipette, so the inside of the cell and the pipette become one. It gives clean recordings of voltage or current, and dye in the pipette can fill the cell for later reconstruction.',
    ],
    related: ['current-clamp', 'voltage-clamp', 'morphology'],
  },
  {
    id: 'sweep',
    term: 'Sweep',
    aka: ['Trace', 'Trial'],
    category: 'Electrophysiology',
    short: 'One recorded episode: a single stimulus and the voltage or current measured during it.',
    body: [
      'A recording protocol is a series of sweeps, for example current steps of increasing amplitude, each a few hundred milliseconds to seconds long. E-features are extracted per sweep and then compared across amplitudes.',
    ],
    platform: [['Data', 'Experimental', 'Single cell electrophysiology']],
    related: ['current-clamp', 'stimulus-protocol', 'e-feature', 'nwb'],
  },
  {
    id: 'nwb',
    term: 'NWB',
    aka: ['Neurodata Without Borders'],
    category: 'Electrophysiology',
    short: 'A standard file format for neurophysiology data and its metadata.',
    body: [
      'NWB files keep recordings together with what is needed to understand them: the stimulus, the subject, the electrode, the units. Using a shared format lets tools read data from any lab.',
    ],
    related: ['sweep', 'metadata', 'current-clamp'],
  },

  // Modelling
  {
    id: 'gating-variable',
    term: 'Gating variable',
    aka: ['m, h, n'],
    category: 'Modelling',
    short: 'A number between 0 and 1 in a channel model for how open one of its gates is.',
    body: [
      'In Hodgkin–Huxley models each gate relaxes towards a voltage-dependent steady state with a voltage-dependent time constant. A channel’s open fraction is a product of its gates, such as m³h for the sodium channel: m opens it, h inactivates it.',
    ],
    related: ['hodgkin-huxley', 'ion-channel', 'nmodl'],
  },
  {
    id: 'nmodl',
    term: 'NMODL',
    aka: ['MOD file'],
    category: 'Modelling',
    short: 'The language ion channel and synapse models are written in for NEURON.',
    body: [
      'A .mod file declares a mechanism’s parameters, state variables and equations; NEURON compiles it to fast code. Ion channel models on the platform are typically stored this way, so they can be dropped into any cell model.',
    ],
    platform: [['Data', 'Model', 'Ion channel model']],
    related: ['neuron-simulator', 'ion-channel', 'gating-variable'],
  },
  {
    id: 'swc',
    term: 'Morphology file formats',
    aka: ['SWC', 'ASC', 'H5'],
    category: 'Modelling',
    short: 'The file types neuron shapes are stored in: SWC, Neurolucida ASC and HDF5.',
    body: [
      'SWC is a plain table, one point per line with its type (soma, axon, dendrite), position, radius and parent. Neurolucida’s ASC also keeps contours and annotations, and HDF5 (H5) is compact for large numbers of cells. Tools convert between them.',
    ],
    platform: [['Data', 'Experimental', 'Morphology']],
    related: ['morphology', 'skeletonization'],
  },
  {
    id: 'sonata',
    term: 'SONATA',
    category: 'Modelling',
    short: 'A file format for describing large circuits and their simulation results.',
    body: [
      'SONATA stores a circuit’s nodes (neurons and their properties) and edges (synapses and theirs) in HDF5, with a configuration that ties in morphologies and electrical models. Simulations write their reports in the same family of formats.',
    ],
    related: ['circuit', 'recording', 'connectome'],
  },
  {
    id: 'model-reduction',
    term: 'Model reduction',
    aka: ['Simplified model'],
    category: 'Modelling',
    short: 'Replacing a detailed model with a cheaper one that behaves nearly the same.',
    body: [
      'A detailed neuron can be reduced to a handful of compartments, or even a point neuron, keeping its input–output behaviour while running far faster. Reduced models make large or long simulations practical.',
    ],
    related: ['point-neuron', 'compartment', 'me-model'],
  },
  {
    id: 'parameter',
    term: 'Parameter',
    category: 'Modelling',
    short:
      'A fixed value that sets how a model behaves, such as a channel density or a synapse’s strength.',
    body: [
      'Some are measured directly, some taken from the literature, and some fitted by optimisation. Varying one at a time and watching the result, a parameter sweep, shows what the model is sensitive to.',
    ],
    related: ['optimisation', 'campaign', 'conductance'],
  },
  {
    id: 'seed',
    term: 'Random seed',
    aka: ['Seed', 'Stochasticity'],
    category: 'Modelling',
    short:
      'The number that starts a simulation’s random number generator, making “random” runs repeatable.',
    body: [
      'Synapse release, background spike trains and circuit building all involve chance. The same seed gives the same result every time; different seeds show how much of a result is chance.',
    ],
    related: ['spike-train', 'campaign', 'simulation'],
  },
  {
    id: 'placement',
    term: 'Cell placement',
    aka: ['Circuit building'],
    category: 'Modelling',
    short:
      'Putting the neurons of a model circuit into an atlas volume, at the right densities and types.',
    body: [
      'Each voxel of a region gets neurons by its density, each is assigned an m-type and e-type from the region’s composition, and a morphology is chosen or synthesised to fit the space. Connections are added afterwards.',
    ],
    related: ['atlas', 'neuron-density', 'morphology-synthesis', 'connectome'],
  },

  // Simulation
  {
    id: 'integration-method',
    term: 'Numerical integration',
    aka: ['Implicit Euler', 'Crank–Nicolson'],
    category: 'Simulation',
    short: 'The method a simulator uses to step a model’s equations forward in time.',
    body: [
      'Neuron models are stiff, mixing very fast and slow processes, so simulators like NEURON use implicit methods that stay stable at reasonable time steps. Crank–Nicolson is more accurate for the same step; backward Euler is more robust.',
    ],
    related: ['time-step', 'neuron-simulator', 'simulation'],
  },
  {
    id: 'spontaneous-activity',
    term: 'Spontaneous activity',
    aka: ['Background activity'],
    category: 'Simulation',
    short: 'What neurons do with no particular stimulus, driven by ongoing synaptic input.',
    body: [
      'The brain is never silent. Model circuits are given background input, such as random spike trains or synaptic noise, until their firing rates resemble those measured in tissue, before any experiment is run on them.',
    ],
    related: ['spike-train', 'excitation-inhibition', 'oscillation'],
  },
  {
    id: 'oscillation',
    term: 'Oscillation',
    aka: ['Brain rhythm', 'Gamma', 'Theta'],
    category: 'Simulation',
    short:
      'Rhythmic, synchronised activity of many neurons, at frequencies from below 1 to above 100 Hz.',
    body: [
      'Rhythms are named by band: delta in deep sleep, theta in the hippocampus during exploration, gamma during attention, often generated by interplay between pyramidal cells and fast-spiking interneurons. They show up clearly in LFP and in spike rasters.',
    ],
    facts: [
      { label: 'Theta', value: '≈ 4 – 8 Hz' },
      { label: 'Gamma', value: '≈ 30 – 100 Hz' },
    ],
    related: ['extracellular-recording', 'spike-raster', 'interneuron', 'gap-junction'],
  },
  {
    id: 'warm-up',
    term: 'Warm-up',
    aka: ['Transient'],
    category: 'Simulation',
    short: 'The start of a simulation, before the model has settled, usually left out of analysis.',
    body: [
      'A model starts from chosen initial values, not from where it would naturally be, so the first tens to hundreds of milliseconds can be artefacts. Stimuli are usually given after it has settled.',
    ],
    related: ['simulation', 'stimulus-protocol', 'spontaneous-activity'],
  },

  // Platform
  {
    id: 'entity',
    term: 'Entity',
    category: 'Platform',
    short:
      'Any single item stored on the platform: a morphology, a model, a simulation, a notebook…',
    body: [
      'Every entity has a type, an id, its files and its metadata, and links to the entities it was made from, so you can trace a simulation back to the circuit, the models and the data behind it.',
    ],
    platform: [['Data']],
    related: ['metadata', 'scope', 'contribute'],
  },
  {
    id: 'metadata',
    term: 'Metadata',
    category: 'Platform',
    short:
      'Information about data: species, brain region, who made it, when, how, under what license.',
    body: [
      'Metadata is what makes data findable and reusable. The filters on the Data page, by region, species, type and more, all work on it.',
    ],
    platform: [['Data', 'Filters']],
    related: ['entity', 'license', 'contribute', 'nwb'],
  },
  {
    id: 'license',
    term: 'License',
    aka: ['CC BY'],
    category: 'Platform',
    short: 'The terms under which data or a model may be used and shared.',
    body: [
      'Open licenses such as Creative Commons Attribution (CC BY) let anyone reuse data as long as its source is credited. Every entity shows its license, and contributing data asks you to choose one.',
    ],
    related: ['metadata', 'contribute', 'scope'],
  },
];
