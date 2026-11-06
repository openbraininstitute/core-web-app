import type { Slide } from '@/features/learn/components/walkthrough/Walkthrough';

/**
 * The neurotransmitters: how a synapse releases them and how their receptors
 * act on the membrane's voltage, fast and slow, exciting, inhibiting or
 * modulating; then each in turn, with its electrical effect and what it is
 * thought to do — glutamate, GABA, glycine, acetylcholine, the monoamines,
 * adenosine, neuropeptides, endocannabinoids and nitric oxide; how the signal
 * is cleared away; and how brain models describe a synapse.
 */
export const NEUROTRANSMITTERS_SLIDES: Slide[] = [
  {
    say: 'Neurons pass signals to one another with chemicals: neurotransmitters',
    note: 'At a synapse, a spike in one neuron releases molecules that cross a narrow gap, the synaptic cleft, and act on the next neuron. Over a hundred are known; a handful do most of the work.',
    widget: 'transmitters:intro',
  },
  {
    say: 'A spike arriving at the terminal releases them',
    note: 'It opens calcium channels, and the calcium flowing in makes vesicles fuse with the membrane and empty thousands of transmitter molecules into the cleft, within about a millisecond.',
    widget: 'transmitters:release',
  },
  {
    say: 'What a transmitter does electrically depends on the receptors it binds',
    note: 'Ionotropic receptors are ion channels themselves, opening within a millisecond for fast potentials. Metabotropic receptors act through G-proteins inside the cell, opening or closing other channels over tens of milliseconds to seconds.',
    widget: 'transmitters:receptors',
  },
  {
    say: 'Each receptor pulls the voltage towards its own reversal potential',
    note: 'Its current is g × (V − E). Receptors reversing above threshold excite the cell; those reversing below it inhibit. So no transmitter is excitatory or inhibitory in itself: its receptors decide.',
    widget: 'transmitters:reversal',
  },
  {
    say: 'A neuron adds up the potentials its synapses make',
    note: 'Excitatory postsynaptic potentials (EPSPs) arriving close together sum, and past threshold the neuron fires; an inhibitory one (an IPSP) among them can keep it from firing.',
    widget: 'transmitters:summation',
  },
  {
    say: 'Other transmitters change how neurons respond, rather than exciting or inhibiting them directly',
    note: "These neuromodulators come from a few small groups of neurons that reach wide areas. Mostly through metabotropic receptors, they change a neuron's excitability: the same input then gives more spikes, or fewer.",
    widget: 'transmitters:modulation',
  },
  {
    say: 'Glutamate is the main excitatory transmitter',
    note: "Released at most of the brain's synapses, it opens AMPA receptors, which let sodium in and potassium out and reverse near 0 mV, so the voltage rises in a fast EPSP. It carries most of the fast signalling in the brain and spinal cord.",
    widget: 'transmitters:glutamate',
  },
  {
    say: 'NMDA receptors pass current only when the cell is already depolarised',
    note: 'At rest, a magnesium ion plugs their pore; depolarisation drives it out, so glutamate and depolarisation must coincide. The calcium they let in triggers the changes in synaptic strength thought to underlie learning and memory. Too much glutamate kills neurons, as after a stroke.',
    widget: 'transmitters:nmda',
  },
  {
    say: "GABA is the brain's main inhibitory transmitter",
    note: 'Its GABA-A receptors let chloride in, pulling the voltage towards about −80 mV: an IPSP. Released mostly by interneurons, it is thought to balance excitation, time spikes and generate brain rhythms. Sedatives such as benzodiazepines and alcohol strengthen it.',
    widget: 'transmitters:gaba',
  },
  {
    say: 'GABA can inhibit without moving the voltage: shunting',
    note: 'Where its reversal potential sits near rest, opening GABA-A channels barely changes the voltage, but makes the membrane leakier, so EPSPs arriving at the same time shrink.',
    widget: 'transmitters:shunting',
  },
  {
    say: 'GABA-B receptors inhibit slowly, through potassium channels',
    note: 'They are metabotropic: a G-protein opens potassium channels nearby, and potassium flowing out makes a slow IPSP lasting hundreds of milliseconds. On the presynaptic side, they reduce transmitter release.',
    widget: 'transmitters:gabab',
  },
  {
    say: 'Glycine inhibits in the spinal cord and brainstem',
    note: "Its receptors, like GABA-A's, let chloride in. It is thought to shape reflexes and rhythmic movement, by inhibiting the motor neurons of opposing muscles; strychnine blocks its receptors and causes convulsions. It also helps open NMDA receptors.",
    widget: 'transmitters:glycine',
  },
  {
    say: 'Acetylcholine makes muscles contract',
    note: 'The first transmitter discovered, by Otto Loewi in 1921. At the junction between nerve and muscle, it opens nicotinic receptors, which let sodium in: a large end-plate potential that normally fires the muscle fibre. An enzyme, acetylcholinesterase, clears it within milliseconds.',
    widget: 'transmitters:acetylcholine',
  },
  {
    say: 'In the brain, acetylcholine modulates, through muscarinic receptors',
    note: "Released from the basal forebrain and brainstem, it closes potassium channels (the M-current) through M1 receptors, so neurons keep firing; through M2 receptors, it slows the heart. It is thought to sharpen attention and help learning and memory; its neurons are lost early in Alzheimer's disease.",
    widget: 'transmitters:muscarinic',
  },
  {
    say: 'Dopamine, noradrenaline, serotonin and histamine come from a few small nuclei',
    note: 'Each is made by a small group of neurons in the brainstem or hypothalamus, whose axons branch across much of the brain: they broadcast a signal, rather than address one cell.',
    widget: 'transmitters:diffuse',
  },
  {
    say: 'Dopamine: D1 receptors tend to raise excitability, D2 receptors to lower it',
    note: "From the substantia nigra and the ventral tegmental area. It is thought to signal reward prediction errors, driving learning, motivation and the initiation of movement. Its loss causes Parkinson's disease; drugs of abuse raise it, and antipsychotics block D2 receptors.",
    widget: 'transmitters:dopamine',
  },
  {
    say: 'Noradrenaline keeps neurons firing, through β receptors',
    note: "From the locus coeruleus. By weakening a potassium current that builds up with firing, it lets neurons keep up their response. It is thought to raise arousal and attention, especially with novelty and stress; it is also the sympathetic nervous system's transmitter for 'fight or flight'. Its neurons fall silent in REM sleep.",
    widget: 'transmitters:noradrenaline',
  },
  {
    say: 'Serotonin acts through at least fourteen receptors, some inhibiting, some exciting',
    note: 'From the raphe nuclei. 5-HT1A receptors open potassium channels and quieten neurons; 5-HT2A receptors excite them, and are the target of psychedelics; 5-HT3 receptors are ion channels. It is thought to influence mood, sleep, appetite and patience; antidepressants such as SSRIs raise its levels.',
    widget: 'transmitters:serotonin',
  },
  {
    say: 'Histamine excites neurons and keeps the brain awake',
    note: 'From the tuberomammillary nucleus of the hypothalamus, whose neurons fire while we are awake and fall silent in sleep. Through H1 receptors it closes potassium channels; antihistamines that reach the brain make you drowsy.',
    widget: 'transmitters:histamine',
  },
  {
    say: 'Adenosine inhibits neurons, and builds up while we are awake',
    note: 'ATP, released with other transmitters, excites through P2X receptors, which are ion channels. Adenosine, made as ATP is broken down, opens potassium channels through A1 receptors and reduces release. It is thought to create sleep pressure; caffeine keeps you awake by blocking its receptors.',
    widget: 'transmitters:purines',
  },
  {
    say: 'Neuropeptides act slowly, and far from where they are released',
    note: "There are over a hundred, among them endorphins (the body's own opioids), substance P, oxytocin and orexin. Packed in large dense-core vesicles, they are released mainly by bursts of spikes, and act through metabotropic receptors to regulate pain, hunger, stress, social bonds and sleep.",
    widget: 'transmitters:peptides',
  },
  {
    say: 'Endocannabinoids travel backwards, from the postsynaptic cell',
    note: "Made from its membrane's lipids when it is strongly excited, they cross back to CB1 receptors on the presynaptic terminal and reduce its release. THC in cannabis acts on the same receptors.",
    widget: 'transmitters:endocannabinoids',
  },
  {
    say: 'Nitric oxide is a gas that passes straight through membranes',
    note: 'Made on demand rather than stored, it spreads to nearby neurons and blood vessels and acts inside them, through cGMP. It is thought to help adjust synaptic strength, and to widen blood vessels where neurons are active.',
    widget: 'transmitters:nitric',
  },
  {
    say: 'The signal ends as the transmitter is cleared away',
    note: "Transporters pump it back into the terminal or into glia, and enzymes break it down, as acetylcholinesterase does acetylcholine. Many drugs act here: SSRIs block serotonin's reuptake, cocaine that of dopamine.",
    widget: 'transmitters:clearing',
  },
  {
    say: 'In summary',
    widget: 'transmitters:summary',
  },
  {
    say: 'In brain models, a synapse is a conductance with a reversal potential and a time course',
    note: "Its current is g(t) × (V − E), the conductance rising and decaying with two time constants. These are the values in the platform's models of the neocortex, which also make release fail at random, and synapses depress and facilitate with use.",
    widget: 'transmitters:models',
  },
  {
    say: 'Next, see how simulators solve these equations',
    widget: 'transmitters:models',
    cta: { course: 'neuron-vs-jaxley', label: 'NEURON and Jaxley' },
  },
];
