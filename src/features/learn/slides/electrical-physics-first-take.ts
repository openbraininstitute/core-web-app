import type { Slide } from '@/features/learn/components/walkthrough/Walkthrough';

/**
 * The electrical physics a single neuron's dynamics rests on, close in on a
 * piece of dendrite: charge and voltage, the membrane as a capacitor, current
 * and conductance, diffusion and the equilibrium potential — where the
 * voltage's field lies, and why the crossings balance — the driving force
 * and rest, the membrane as a circuit and its time constant, the dendrite as
 * a cable and its length constant, voltage-gated channels and the spike — and
 * the one equation behind all of it.
 */
export const ELECTRICAL_PHYSICS_FIRST_TAKE_SLIDES: Slide[] = [
  {
    say: "To understand a neuron's electrical life, look closely at a piece of dendrite",
    note: 'Its membrane, a double layer of lipids, separates the salty fluid inside from the fluid outside, both full of ions.',
    widget: 'physics:zoom',
  },
  {
    say: 'Ions carry electric charge',
    note: 'Potassium and sodium ions are positive; chloride ions and the proteins inside the cell are negative. Like charges push apart, and opposite charges pull together.',
    widget: 'physics:charge',
  },
  {
    say: 'When charge is separated, there is a voltage',
    note: 'With negative charge on one side of the membrane and positive on the other, a voltmeter between them reads a voltage: here −70 mV, the inside relative to the outside.',
    widget: 'physics:separate',
  },
  {
    say: 'The membrane is a capacitor',
    note: 'Two conductors, the fluids inside and out, with an insulator between them, the membrane. The charge it holds is its capacitance times the voltage: Q = C · V.',
    widget: 'physics:capacitor',
  },
  {
    say: 'A voltage takes surprisingly few ions',
    note: 'Because the membrane is so thin, a few thousand ions per square micrometre are enough, and the fluid either side stays neutral almost everywhere.',
    widget: 'physics:few',
  },
  {
    say: 'Away from the membrane, the fluids stay neutral',
    note: "In each fluid, every positive charge is matched by a negative one: inside, potassium's mostly by proteins and other large molecules that can't leave. Any surplus would make an enormous voltage, so ions move within a nanosecond to cancel it. Only the thin layer of charge at the membrane is left unmatched.",
    widget: 'physics:neutral',
  },
  {
    say: 'Current is charge on the move',
    note: 'Ions can only cross the membrane through channels, proteins with a pore. Each ion that crosses carries its charge with it.',
    widget: 'physics:current',
  },
  {
    say: 'The more channels are open, the larger the current',
    note: "Open channels make a conductance, g. For the same push, the current grows with it: I = g · V, Ohm's law.",
    widget: 'physics:conductance',
  },
  {
    say: 'Ions also flow down their concentration gradient',
    note: 'There is far more potassium inside the cell than outside, so with potassium channels open, potassium leaks out.',
    widget: 'physics:diffusion',
  },
  {
    say: 'Until the voltage pushes back: the equilibrium potential',
    note: "Each potassium ion that leaves takes positive charge with it, so the inside turns negative and pulls potassium back. The two balance at about −89 mV: potassium's equilibrium, or Nernst, potential.",
    widget: 'physics:nernst',
  },
  {
    say: "The voltage's field lies only within the membrane",
    note: 'The separated charge sits in two thin sheets, one on each face of the membrane, so its field fills just the 5 nm between them: about 18 million volts per metre. The fluid either side has next to none, so an ion feels the voltage only while it crosses, through a channel.',
    widget: 'physics:field',
  },
  {
    say: 'At equilibrium, as many ions cross in as out',
    note: 'There are 28 times as many potassium ions inside, so 28 times as many reach a channel from inside. But leaving means climbing against the field, and only an ion jiggling hard enough makes it. Once the climb is 89 mV, just 1 in 28 does, and the crossings balance.',
    widget: 'physics:crossing',
  },
  {
    say: 'Every ion has its own equilibrium potential',
    note: "Each is set by the ion's concentrations inside and out: about −89 mV for potassium, −64 mV for chloride and +67 mV for sodium.",
    widget: 'physics:reversal',
  },
  {
    say: 'The driving force is the distance to equilibrium',
    note: 'Each ion is pushed towards its own equilibrium, the harder the further the voltage is from it: its current is I = g · (V − E).',
    widget: 'physics:driving',
  },
  {
    say: 'At rest, the voltage settles where the currents cancel',
    note: "Each ion pulls the voltage towards its own equilibrium, in proportion to its conductance. Mostly potassium's channels are open, so rest sits near potassium's equilibrium: about −72 mV here.",
    widget: 'physics:rest',
  },
  {
    say: 'So the membrane is an electrical circuit',
    note: 'A capacitor, in parallel with a branch for each ion: a conductance, its channels, and a battery, its equilibrium potential.',
    widget: 'physics:circuit',
  },
  {
    say: 'Charging the membrane takes time',
    note: 'Inject a step of current and the voltage rises along a curve, not at once: 63% of the way after one time constant, τ = R · C, here 20 ms.',
    widget: 'physics:rc',
  },
  {
    say: 'Current also flows along the dendrite',
    note: 'Seen from further away, a dendrite is a cable: a chain of these circuits, each joined to its neighbours through the resistance of the fluid inside.',
    widget: 'physics:cable',
  },
  {
    say: 'So a voltage fades with distance',
    note: 'Current leaks out as it goes. A steady voltage falls to 37% over one length constant, λ: about 0.8 mm for a 2 µm dendrite.',
    widget: 'physics:length',
  },
  {
    say: 'Some channels open and close with the voltage',
    note: 'Raise the voltage, and sodium channels open fast and then shut; potassium channels open more slowly.',
    widget: 'physics:gated',
  },
  {
    say: 'Positive feedback makes a spike',
    note: 'Sodium rushes in and raises the voltage, opening more sodium channels; then potassium flows out and brings it back down. For a moment, the inside turns positive.',
    widget: 'physics:spike',
  },
  {
    say: 'All of it is one equation, solved for every piece of the neuron',
    note: 'Charging the capacitor balances the currents: through each kind of channel, from the neighbouring compartments, and from any electrode. Simulators solve it for thousands of compartments at once.',
    widget: 'physics:equation',
  },
  {
    say: 'Next, see how simulators solve it',
    widget: 'physics:equation',
    cta: { course: 'neuron-vs-jaxley', label: 'NEURON and Jaxley' },
  },
];
