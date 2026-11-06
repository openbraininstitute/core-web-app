/*
 * More Learn glossary terms, kept apart from the first set only to keep each file readable.
 * glossary.ts puts them in GLOSSARY.
 */

import type { GlossaryTerm } from '@/features/learn/glossary';

export const MORE_TERMS: GlossaryTerm[] = [
  // Neuroscience
  {
    id: 'soma',
    term: 'Soma',
    aka: ['Cell body'],
    category: 'Neuroscience',
    short: 'The body of a neuron, holding the nucleus, from which dendrites and the axon grow.',
    body: [
      'The soma keeps the cell alive, making the proteins it needs, and is where input from the dendrites comes together before the axon decides whether to fire.',
      'In reconstructions it is often drawn as a contour or a sphere; in models it is usually a single compartment.',
    ],
    facts: [{ label: 'Diameter', value: '≈ 10 – 30 µm' }],
    related: ['neuron', 'dendrite', 'axon', 'morphology'],
  },
  {
    id: 'pyramidal-cell',
    term: 'Pyramidal cell',
    aka: ['PC'],
    category: 'Neuroscience',
    short:
      'The main excitatory neuron of the cortex and hippocampus, with a triangular soma and one long apical dendrite.',
    body: [
      'Pyramidal cells make up most of the cortex’s neurons and nearly all of its long-range output. Their apical dendrite climbs towards the surface through several layers, so they gather input from many of them.',
      'They come in many m-types, by layer and shape: thick-tufted layer 5 cells (L5_TPC) are among the most studied neurons in the brain.',
    ],
    facts: [{ label: 'Share of cortical neurons', value: '≈ 70 – 80 %' }],
    related: ['interneuron', 'm-type', 'cortical-layer', 'dendritic-spine'],
  },
  {
    id: 'interneuron',
    term: 'Interneuron',
    category: 'Neuroscience',
    short: 'A local, mostly inhibitory neuron that shapes the activity of the cells around it.',
    body: [
      'Cortical interneurons release GABA and keep excitation in check. They are very varied: basket cells target the soma, chandelier cells the axon initial segment, Martinotti cells the distal dendrites.',
      'They are also grouped by molecular markers, such as parvalbumin (PV, often fast-spiking), somatostatin (SST) and VIP.',
    ],
    facts: [{ label: 'Share of cortical neurons', value: '≈ 15 – 30 %' }],
    related: ['pyramidal-cell', 'excitation-inhibition', 'e-type', 'm-type'],
  },
  {
    id: 'dendritic-spine',
    term: 'Dendritic spine',
    aka: ['Spine'],
    category: 'Neuroscience',
    short: 'A tiny protrusion on a dendrite that receives a single excitatory synapse.',
    body: [
      'Spines give excitatory synapses their own small compartment, which isolates them chemically and electrically. They grow, shrink and disappear with learning, so their number and shape change over a lifetime.',
      'Cells with many spines, like pyramidal cells, are called spiny; most interneurons are smooth or sparsely spiny.',
    ],
    facts: [{ label: 'Length', value: '≈ 0.5 – 2 µm' }],
    related: ['dendrite', 'synapse', 'synaptic-plasticity', 'pyramidal-cell'],
  },
  {
    id: 'bouton',
    term: 'Bouton',
    aka: ['Axonal bouton', 'Varicosity'],
    category: 'Neuroscience',
    short:
      'A swelling along or at the end of an axon where the presynaptic side of a synapse sits.',
    body: [
      'Boutons hold the vesicles of neurotransmitter released when a spike arrives. How many there are per micrometre of axon, the bouton density, is one of the numbers used to decide how many synapses a model circuit should have.',
    ],
    platform: [['Data', 'Experimental', 'Bouton density']],
    related: ['axon', 'synapse', 'neurotransmitter', 'connectome'],
  },
  {
    id: 'neurotransmitter',
    term: 'Neurotransmitter',
    category: 'Neuroscience',
    short: 'A chemical a neuron releases at its synapses to signal to the next cell.',
    body: [
      'Glutamate is the main excitatory transmitter in the brain and GABA the main inhibitory one. Others, such as dopamine, serotonin and acetylcholine, act more slowly and more broadly, changing how circuits behave rather than carrying fast signals.',
    ],
    related: ['synapse', 'excitation-inhibition', 'postsynaptic-potential'],
  },
  {
    id: 'excitation-inhibition',
    term: 'Excitation and inhibition',
    aka: ['E/I balance'],
    category: 'Neuroscience',
    short: 'Input that pushes a neuron towards firing, and input that holds it back.',
    body: [
      'Excitatory synapses depolarise the target, inhibitory ones hyperpolarise it or clamp it near rest. Healthy circuits keep the two in balance: too much excitation and activity runs away, as in a seizure; too much inhibition and it falls silent.',
      'Tuning this balance is one of the main checks that a model circuit behaves like tissue.',
    ],
    related: ['interneuron', 'neurotransmitter', 'postsynaptic-potential', 'circuit'],
  },
  {
    id: 'synaptic-plasticity',
    term: 'Synaptic plasticity',
    aka: ['LTP', 'LTD', 'STP'],
    category: 'Neuroscience',
    short: 'Changes in the strength of a synapse with use, from milliseconds to a lifetime.',
    body: [
      'Short-term plasticity (STP) changes a synapse over a train of spikes: some depress, getting weaker with each spike, others facilitate. Long-term potentiation and depression (LTP, LTD) change it for hours or longer and are thought to underlie learning and memory.',
    ],
    related: ['synapse', 'synapse-model', 'dendritic-spine'],
  },
  {
    id: 'neocortex',
    term: 'Neocortex',
    aka: ['Cortex', 'Cerebral cortex'],
    category: 'Neuroscience',
    short: 'The folded outer sheet of the mammalian brain, organised in six layers.',
    body: [
      'The neocortex handles perception, movement, language and thought. Across areas it repeats a similar layered circuit, which is why a well-measured patch, such as the rat’s somatosensory cortex, has been the starting point for detailed circuit models.',
    ],
    facts: [{ label: 'Thickness', value: '≈ 2 – 4 mm (human)' }],
    related: ['cortical-layer', 'somatosensory-cortex', 'brain-region'],
  },
  {
    id: 'somatosensory-cortex',
    term: 'Somatosensory cortex',
    aka: ['S1', 'SSCx'],
    category: 'Neuroscience',
    short: 'The area of cortex that processes touch, pressure, temperature and body position.',
    body: [
      'In rodents part of it, the barrel cortex, has one column per whisker, which makes it easy to relate structure to function. The Blue Brain Project’s neocortical microcircuit was built from the juvenile rat’s somatosensory cortex.',
    ],
    related: ['neocortex', 'cortical-layer', 'circuit', 'thalamus'],
  },
  {
    id: 'hippocampus',
    term: 'Hippocampus',
    aka: ['CA1', 'CA3'],
    category: 'Neuroscience',
    short:
      'A curved structure deep in the brain, essential for forming memories and finding the way.',
    body: [
      'Its regions, the dentate gyrus and the CA fields, form a loop through which information passes; CA1 pyramidal cells are some of the best characterised neurons there are. It is also one of the first regions damaged in Alzheimer’s disease.',
    ],
    related: ['pyramidal-cell', 'brain-region', 'synaptic-plasticity'],
  },
  {
    id: 'thalamus',
    term: 'Thalamus',
    category: 'Neuroscience',
    short: 'A relay at the centre of the brain that passes sensory signals on to the cortex.',
    body: [
      'Nearly every sense except smell goes through the thalamus on its way to the cortex, mostly arriving in layer 4. The thalamus and cortex are wired in loops, which also take part in sleep rhythms and attention.',
    ],
    related: ['cortical-layer', 'somatosensory-cortex', 'brain-region'],
  },
  {
    id: 'glia',
    term: 'Glia',
    aka: ['Glial cells', 'Astrocyte'],
    category: 'Neuroscience',
    short: 'The brain’s non-neuronal cells, which support, protect and feed neurons.',
    body: [
      'Astrocytes wrap synapses and blood vessels and shuttle energy to neurons; oligodendrocytes make the myelin that speeds up axons; microglia are the brain’s immune cells.',
      'Neuro-glia-vascular models put neurons, astrocytes and blood vessels together, to study how the brain’s energy supply keeps up with its activity.',
    ],
    related: ['ngv', 'neuron'],
  },
  {
    id: 'ngv',
    term: 'Neuro-glia-vascular unit',
    aka: ['NGV'],
    category: 'Modelling',
    short: 'Neurons, astrocytes and the blood vessels between them, modelled together.',
    body: [
      'Active neurons need energy, delivered by blood and passed on by astrocytes. NGV models link a neuronal circuit to astrocytes and a vascular network to study that supply, and what goes wrong in disease.',
    ],
    platform: [['Data', 'Model', 'NGV circuit']],
    related: ['glia', 'circuit', 'metabolism'],
  },
  {
    id: 'metabolism',
    term: 'Brain metabolism',
    aka: ['Metabolism'],
    category: 'Modelling',
    short: 'How brain cells make and use energy, mostly from glucose and oxygen.',
    body: [
      'The brain is about 2 % of body weight and uses about 20 % of its energy, most of it to pump ions back after signalling. Metabolism models follow the reactions inside neurons and astrocytes that turn glucose into the ATP the pumps run on.',
    ],
    facts: [{ label: 'Share of the body’s energy', value: '≈ 20 %' }],
    related: ['ngv', 'glia'],
  },
  {
    id: 'neuron-density',
    term: 'Neuron density',
    aka: ['Cell density'],
    category: 'Neuroscience',
    short: 'How many neurons there are per cubic millimetre of a brain region.',
    body: [
      'Densities, counted in tissue for each region, layer and often cell type, decide how many neurons are placed where when a circuit is built in an atlas.',
    ],
    facts: [{ label: 'Mouse cortex', value: '≈ 100,000 / mm³' }],
    platform: [['Data', 'Experimental', 'Neuron density']],
    related: ['brain-region', 'circuit', 'atlas'],
  },
  {
    id: 'atlas',
    term: 'Brain atlas',
    aka: ['Atlas', 'CCF'],
    category: 'Neuroscience',
    short: 'A 3D reference map of the brain that names every region at every point.',
    body: [
      'An atlas is a volume of voxels, each labelled with a region from a hierarchy. Registering data to the same atlas, such as the Allen mouse Common Coordinate Framework (CCF), makes measurements from different labs comparable and gives circuit building its coordinates.',
    ],
    platform: [['Data', 'Brain region']],
    related: ['brain-region', 'neuron-density', 'circuit'],
  },

  // Electrophysiology
  {
    id: 'depolarisation',
    term: 'Depolarisation',
    aka: ['Hyperpolarisation'],
    category: 'Electrophysiology',
    short: 'A rise in membrane potential towards zero; hyperpolarisation is a fall away from it.',
    body: [
      'Excitatory input, or current injected into the cell, depolarises it; enough depolarisation brings it to threshold and it fires. Inhibitory input, and the after-hyperpolarisation that follows a spike, push it the other way.',
    ],
    related: ['membrane-potential', 'action-potential', 'postsynaptic-potential'],
  },
  {
    id: 'postsynaptic-potential',
    term: 'Postsynaptic potential',
    aka: ['PSP', 'EPSP', 'IPSP'],
    category: 'Electrophysiology',
    short: 'The small change in a neuron’s voltage caused by one synapse becoming active.',
    body: [
      'An excitatory PSP (EPSP) is a brief depolarisation, an inhibitory one (IPSP) usually a hyperpolarisation. A single one is typically well under a millivolt at the soma, so many must add up in time and space to make the cell fire.',
    ],
    facts: [{ label: 'Typical EPSP at the soma', value: '≈ 0.1 – 2 mV' }],
    related: ['synapse', 'excitation-inhibition', 'depolarisation', 'synapse-model'],
  },
  {
    id: 'reversal-potential',
    term: 'Reversal potential',
    aka: ['Equilibrium potential', 'E_rev'],
    category: 'Electrophysiology',
    short: 'The voltage at which no net current flows through a channel for its ion.',
    body: [
      'Each ion has its own, set by the difference in its concentration inside and outside the cell (the Nernst equation). Opening a channel pulls the membrane towards that channel’s reversal potential, which is why sodium channels excite and potassium channels calm.',
    ],
    facts: [
      { label: 'Sodium', value: '≈ +50 mV' },
      { label: 'Potassium', value: '≈ −90 mV' },
    ],
    related: ['ion-channel', 'membrane-potential', 'conductance'],
  },
  {
    id: 'conductance',
    term: 'Conductance',
    aka: ['g', 'gbar'],
    category: 'Electrophysiology',
    short: 'How easily current flows through a set of channels: the inverse of resistance.',
    body: [
      'A channel’s current is its conductance times the distance of the voltage from its reversal potential. In models, each channel type gets a maximal conductance density (gbar) per area of membrane, and these densities are what e-model optimisation tunes.',
    ],
    facts: [{ label: 'Unit', value: 'siemens (S)' }],
    related: ['ion-channel', 'reversal-potential', 'e-model', 'optimisation'],
  },
  {
    id: 'voltage-clamp',
    term: 'Voltage clamp',
    category: 'Electrophysiology',
    short: 'Holding a cell at a chosen voltage and measuring the current needed to keep it there.',
    body: [
      'Because the voltage is fixed, the current recorded is the current through the channels, which is how ion channel kinetics are measured. Hodgkin and Huxley used it to work out the action potential.',
    ],
    platform: [['Data', 'Experimental', 'Ion channel electrophysiology']],
    related: ['current-clamp', 'ion-channel', 'hodgkin-huxley'],
  },
  {
    id: 'rheobase',
    term: 'Rheobase',
    category: 'Electrophysiology',
    short: 'The smallest steady current that makes a neuron fire.',
    body: [
      'Found by stepping the injected current up until the first spike appears. Stimulus protocols are often scaled to it, for example steps at 150 % of rheobase, so that cells of different excitability can be compared.',
    ],
    related: ['current-clamp', 'input-resistance', 'stimulus-protocol', 'e-feature'],
  },
  {
    id: 'input-resistance',
    term: 'Input resistance',
    aka: ['R_in'],
    category: 'Electrophysiology',
    short: 'How much a neuron’s voltage changes per unit of current injected, below threshold.',
    body: [
      'Small cells with few open channels have high input resistance and respond strongly to small input; large cells, or cells with many open channels, have low input resistance. It is measured from the voltage step caused by a small hyperpolarising current.',
    ],
    facts: [{ label: 'Typical', value: '≈ 50 – 500 MΩ' }],
    related: ['rheobase', 'e-feature', 'conductance'],
  },
  {
    id: 'firing-rate',
    term: 'Firing rate',
    aka: ['Spike rate', 'Frequency'],
    category: 'Electrophysiology',
    short: 'How many action potentials a neuron fires per second.',
    body: [
      'Rates range from silence to hundreds of spikes per second in fast-spiking interneurons. Plotting rate against injected current gives the f–I curve, a compact summary of how excitable a cell is.',
    ],
    facts: [{ label: 'Unit', value: 'Hz (spikes / s)' }],
    related: ['action-potential', 'e-feature', 'spike-raster'],
  },
  {
    id: 'e-feature',
    term: 'E-feature',
    aka: ['Electrical feature', 'eFEL'],
    category: 'Electrophysiology',
    short: 'A number measured from a voltage trace, such as spike count, latency or adaptation.',
    body: [
      'Features turn traces into values that can be compared. Tools such as eFEL extract hundreds of them; a chosen set, with their means and spreads across recordings, is the target an e-model is optimised to match.',
    ],
    platform: [
      ['Data', 'Experimental', 'Intracellular e-feature extraction'],
      ['Workflows', 'Extract'],
    ],
    related: ['current-clamp', 'e-model', 'optimisation', 'rheobase'],
  },
  {
    id: 'extracellular-recording',
    term: 'Extracellular recording',
    aka: ['LFP', 'Multi-electrode array'],
    category: 'Electrophysiology',
    short:
      'Measuring voltage outside cells, picking up spikes of nearby neurons and slower field potentials.',
    body: [
      'An electrode in tissue records the spikes of cells close to it and the local field potential (LFP), the summed slow currents of many cells. Arrays such as Neuropixels probes record hundreds of sites at once.',
      'Simulations can compute the same signals from a model circuit, so model and experiment can be compared directly.',
    ],
    platform: [['Data', 'Model', 'Extracellular recording array']],
    related: ['circuit', 'simulation', 'spike-raster'],
  },

  // Modelling
  {
    id: 'cable-theory',
    term: 'Cable theory',
    category: 'Modelling',
    short: 'The mathematics of how voltage spreads and fades along a thin, leaky branch.',
    body: [
      'A dendrite or axon behaves like an undersea telegraph cable: current leaks out through the membrane as it travels, so signals shrink with distance. Wilfrid Rall applied it to neurons; multi-compartment models solve it numerically.',
    ],
    facts: [{ label: 'Length constant', value: '≈ 0.1 – 1 mm' }],
    related: ['compartment', 'dendrite', 'neuron-simulator'],
  },
  {
    id: 'point-neuron',
    term: 'Point neuron',
    aka: ['Integrate-and-fire', 'LIF'],
    category: 'Modelling',
    short: 'A neuron model with no shape, reduced to a single voltage.',
    body: [
      'The leaky integrate-and-fire neuron, the simplest, sums its input and emits a spike when the voltage crosses threshold, then resets. Point neurons are thousands of times cheaper than detailed ones, so they are used for very large networks, at the cost of dendritic effects.',
    ],
    related: ['compartment', 'me-model', 'circuit'],
  },
  {
    id: 'synapse-model',
    term: 'Synapse model',
    aka: ['Tsodyks–Markram'],
    category: 'Modelling',
    short: 'Equations for how a model synapse responds to each spike it receives.',
    body: [
      'A synapse model gives the conductance change each spike causes, its rise and decay times, and how it changes over a spike train. The Tsodyks–Markram model captures short-term depression and facilitation with a few parameters, fitted per pair of cell types.',
    ],
    related: ['synapse', 'synaptic-plasticity', 'postsynaptic-potential', 'synaptome'],
  },
  {
    id: 'connectome',
    term: 'Connectome',
    aka: ['Connectivity'],
    category: 'Modelling',
    short: 'The map of which neurons connect to which, and how strongly.',
    body: [
      'At the finest level it lists every synapse, as electron microscopy now delivers for small volumes. Model circuits build theirs from rules: where axons and dendrites come close, synapses are placed and then pruned to match measured connection probabilities and synapses per connection.',
    ],
    platform: [['Data', 'Experimental', 'Synapse per connection']],
    related: ['circuit', 'synapse', 'bouton', 'em-mesh'],
  },
  {
    id: 'optimisation',
    term: 'Optimisation',
    aka: ['Parameter fitting'],
    category: 'Modelling',
    short: 'Searching for the model parameters that best reproduce experimental data.',
    body: [
      'For an e-model, the parameters are channel densities and the score is how far the model’s e-features are from the recorded ones. Evolutionary algorithms try many candidate models, keep the best, and vary them, often over thousands of generations.',
    ],
    platform: [
      ['Workflows', 'Optimize'],
      ['Data', 'Simulation', 'E-model optimization result'],
    ],
    related: ['e-model', 'e-feature', 'validation'],
  },
  {
    id: 'validation',
    term: 'Validation',
    category: 'Modelling',
    short: 'Checking a model against data it was not fitted to.',
    body: [
      'A model that matches what it was tuned on proves little; one that also predicts other measurements, such as responses to a new stimulus or the behaviour of a whole circuit, earns trust. Keeping fitting and validation data separate is the rule.',
    ],
    related: ['optimisation', 'e-model', 'in-silico'],
  },
  {
    id: 'morphology-synthesis',
    term: 'Morphology synthesis',
    aka: ['Synthesised morphology'],
    category: 'Modelling',
    short:
      'Growing new, realistic neuron shapes by computer from the statistics of reconstructed ones.',
    body: [
      'There are far fewer reconstructed neurons than there are cells in a circuit. Synthesis learns branching statistics from reconstructions of an m-type and grows as many new ones as needed, each unique and fitted to where it is placed.',
    ],
    platform: [['Data', 'Model', 'Synthesized morphology']],
    related: ['morphology', 'm-type', 'circuit'],
  },
  {
    id: 'em-mesh',
    term: 'EM cell mesh',
    aka: ['Electron microscopy'],
    category: 'Neuroscience',
    short: 'A neuron’s full 3D surface, segmented from electron microscopy images.',
    body: [
      'Electron microscopy images tissue at nanometre resolution, enough to see every synapse. Segmenting a cell gives a surface mesh; skeletonising it gives a morphology that models can use.',
    ],
    platform: [
      ['Data', 'Experimental', 'EM mesh'],
      ['Workflows', 'Process', 'Skeletonization'],
    ],
    related: ['morphology', 'connectome', 'skeletonization'],
  },
  {
    id: 'skeletonization',
    term: 'Skeletonization',
    category: 'Modelling',
    short: 'Turning a 3D cell mesh into a tree of centrelines with radii, a morphology.',
    body: [
      'The mesh from electron microscopy is detailed but heavy; its skeleton keeps the branching and thickness that matter for electrical models, in a form simulators can read.',
    ],
    platform: [['Workflows', 'Process', 'Skeletonization']],
    related: ['em-mesh', 'morphology'],
  },
  {
    id: 'circuit-extraction',
    term: 'Circuit extraction',
    category: 'Modelling',
    short: 'Cutting a smaller circuit out of a large one, keeping its cells and connections.',
    body: [
      'Large circuits are expensive to simulate. Extracting the neurons of one region, layer or type, with the synapses between them and optionally their inputs from outside, gives a circuit that answers a focused question cheaply.',
    ],
    platform: [['Workflows', 'Extract', 'Circuit']],
    related: ['circuit', 'campaign'],
  },

  // Simulation
  {
    id: 'spike-raster',
    term: 'Spike raster',
    aka: ['Raster plot'],
    category: 'Simulation',
    short: 'A plot of spike times, one row per neuron and one dot per spike.',
    body: [
      'Rasters show at a glance what a network did: silence, irregular firing, synchronous waves. Sorting rows by layer or cell type makes patterns between populations visible.',
    ],
    related: ['firing-rate', 'simulation', 'circuit'],
  },
  {
    id: 'spike-train',
    term: 'Spike train',
    aka: ['Poisson input'],
    category: 'Simulation',
    short: 'A sequence of spike times, given to synapses as input or recorded as output.',
    body: [
      'To drive a model with background activity, synapses are often given Poisson spike trains, random times at a chosen mean rate, standing in for the many neurons not in the model.',
    ],
    related: ['stimulus-protocol', 'synaptome', 'spike-raster'],
  },
  {
    id: 'campaign',
    term: 'Campaign',
    aka: ['Simulation campaign'],
    category: 'Simulation',
    short: 'A set of related runs, each with one parameter changed, launched and stored together.',
    body: [
      'Sweeping a stimulus amplitude, a synapse strength or a seed gives one simulation per value. A campaign keeps them together, so the results can be compared and the whole set reproduced.',
    ],
    platform: [
      ['Workflows', 'Simulate'],
      ['Data', 'Simulation'],
    ],
    related: ['simulation', 'in-silico'],
  },
  {
    id: 'recording',
    term: 'Simulation report',
    aka: ['Recording', 'Output'],
    category: 'Simulation',
    short: 'What a simulation saves: voltages, currents or spikes from chosen places, over time.',
    body: [
      'Saving everything everywhere would be enormous, so before running you choose what to record: the soma voltage of some cells, spikes of all of them, a current in one dendrite. The reports are the simulation’s results.',
    ],
    related: ['simulation', 'spike-raster', 'extracellular-recording'],
  },
  {
    id: 'in-silico',
    term: 'In silico experiment',
    aka: ['In silico'],
    category: 'Simulation',
    short: 'An experiment done on a computer model instead of living tissue.',
    body: [
      'In silico experiments can do what is hard or impossible in the lab: record every neuron at once, remove one cell type, or repeat a trial exactly. Their answers are predictions, to be tested in vivo (in a living animal) or in vitro (in a dish or slice).',
    ],
    related: ['simulation', 'validation', 'campaign'],
  },
  {
    id: 'hpc',
    term: 'High-performance computing',
    aka: ['HPC'],
    category: 'Simulation',
    short: 'Running large simulations across many processors at once.',
    body: [
      'A single detailed neuron runs on a laptop; a circuit of millions needs a cluster or supercomputer, with neurons split across thousands of cores that exchange spikes every few milliseconds. The platform runs these for you and charges credits for the compute.',
    ],
    related: ['simulation', 'credits', 'circuit'],
  },

  // Platform
  {
    id: 'workflow',
    term: 'Workflow',
    category: 'Platform',
    short: 'A guided set of steps on the platform for building, simulating or analysing something.',
    body: [
      'Workflows are grouped by what they do: Build (models such as ion channels and synaptomes), Simulate, Extract, Optimize and Process. Each walks through the configuration and runs the job, and its results appear under Data.',
    ],
    platform: [['Workflows']],
    related: ['simulation', 'campaign', 'project'],
  },
  {
    id: 'scope',
    term: 'Public and project data',
    aka: ['Scope'],
    category: 'Platform',
    short: 'Data anyone on the platform can see, and data that belongs to your project.',
    body: [
      'Data, Notebooks and Workflows can each be switched between what is public, shared with everyone, and what belongs to the current project. What you upload or create starts out in your project.',
    ],
    platform: [['Data', 'Public | Project']],
    related: ['project', 'contribute'],
  },
  {
    id: 'contribute',
    term: 'Contribute',
    aka: ['Upload data'],
    category: 'Platform',
    short: 'Adding your own data or models to a project, with the details that describe them.',
    body: [
      'Uploading a morphology, a recording or a notebook asks for its metadata too, such as species, brain region and license, so it can be found, filtered and reused like the platform’s own data.',
    ],
    platform: [
      ['Data', 'Upload data'],
      ['Notebooks', 'Upload notebook'],
    ],
    related: ['scope', 'project', 'notebook'],
  },
  {
    id: 'ai-assistant',
    term: 'AI assistant',
    category: 'Platform',
    short: 'The chat beside every page, which can answer questions and look up data for you.',
    body: [
      'Ask it to explain a concept, find datasets that match a description, or help configure a workflow. It can use tools to search the platform’s data, so its answers can point to real entities.',
    ],
    related: ['project', 'workflow'],
  },
];
