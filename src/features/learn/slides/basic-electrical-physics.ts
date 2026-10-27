import type { Slide } from '@/features/learn/components/walkthrough/Walkthrough';

/**
 * The electrical physics needed to model neuronal circuits, from the ground
 * up, in five sections: basic terms and concepts — charge, the particles that
 * carry it, atoms, molecules and ions, current, force, work, voltage,
 * resistance, conductance, Ohm's law, capacitance and power; electrical
 * circuits, their parts, and components in parallel and in series; the RC
 * circuit, Kirchhoff's voltage law, charging a capacitor and the time
 * constant; cable theory; and the electric field.
 */
export const BASIC_ELECTRICAL_PHYSICS_SLIDES: Slide[] = [
  {
    say: "In this course, we'll cover the main concepts of electrical physics needed to model neuronal circuits electrically",
    widget: 'elec:intro',
  },
  {
    say: 'Charge is a fundamental property of matter',
    note: 'It comes in two types, positive and negative. It is measured in coulombs (C), and written q or Q.',
    widget: 'elec:charge',
  },
  {
    say: 'Charges of the same type repel, and of different types attract',
    note: 'Two positive charges push each other apart, as do two negative ones; a positive and a negative pull together.',
    widget: 'elec:attract',
  },
  {
    say: 'Charge is carried by subatomic particles: protons, neutrons and electrons',
    note: "A proton's charge is +1.602 × 10⁻¹⁹ C, and an electron's the same but negative. Neutrons are neutral, so other charges neither attract nor repel them. We consider just these three particles, and leave quantum physics aside.",
    widget: 'elec:particles',
  },
  {
    say: 'Protons and neutrons are of similar size and weight; electrons are far smaller and lighter',
    note: 'Protons and neutrons are about 0.85 femtometres in radius and weigh about 1.67 × 10⁻²⁷ kg, neutrons slightly more. Electrons are at least a thousand times smaller, and 1836 times lighter.',
    widget: 'elec:sizes',
  },
  {
    say: 'Atoms are made of protons and neutrons in a central nucleus, with electrons orbiting it',
    note: 'An atom has as many electrons as protons, so it is electrically neutral. There are 118 known types of atom, the elements of the periodic table, each defined by its number of protons.',
    widget: 'elec:atom',
  },
  {
    say: 'Molecules are atoms bound together',
    note: 'Atoms of the same type, as in oxygen, O₂, or of different types, as in water, H₂O.',
    widget: 'elec:molecules',
  },
  {
    say: 'Atoms or molecules that gain or lose electrons carry a charge: they are ions',
    note: 'Each type typically falls into one or a few ionic states. Sodium and potassium lose an electron, becoming Na⁺ and K⁺; calcium loses two, becoming Ca²⁺; and chlorine gains one, becoming chloride, Cl⁻.',
    widget: 'elec:ions',
  },
  {
    say: 'Current is the rate of flow of charge',
    note: 'I = Q / t, measured in amperes (A): one ampere is one coulomb per second.',
    widget: 'elec:current',
  },
  {
    say: 'In biological tissue, current is carried by ions',
    note: 'Chiefly sodium (Na⁺), potassium (K⁺), chloride (Cl⁻) and calcium (Ca²⁺).',
    widget: 'elec:carriers',
  },
  {
    say: 'Direct current flows in one direction; alternating current periodically reverses',
    note: 'Alternating current is useful for transmitting power, but is not often found in biological systems.',
    widget: 'elec:acdc',
  },
  {
    say: 'A force is an interaction which causes an object or particle to accelerate',
    note: 'Push a charge with a steady force, and it moves faster and faster.',
    widget: 'elec:force',
  },
  {
    say: 'Work done is the energy transferred when a force moves a charge through a distance',
    note: 'W = F × d, measured in joules (J).',
    widget: 'elec:work',
  },
  {
    say: 'Work is required to separate charges, and creates a voltage',
    note: 'The electrical work done moving a charge q through a voltage V is W = q V, measured in joules (J).',
    widget: 'elec:separate',
  },
  {
    say: 'Voltage, or potential difference, is electrical potential energy per unit charge',
    note: 'V = W / q, measured in volts (V). Voltage drives current through a circuit; in neurons, it is the membrane potential.',
    widget: 'elec:voltage',
  },
  {
    say: 'Resistance is the opposition to the flow of current',
    note: "R = V / I, measured in ohms (Ω). In neurons, the membrane's resistance and the axial resistance along the inside regulate how signals flow.",
    widget: 'elec:resistance',
  },
  {
    say: 'Conductance is the inverse of resistance',
    note: "G = 1 / R, measured in siemens (S). Opening ion channels increases the membrane's conductance.",
    widget: 'elec:conductance',
  },
  {
    say: "Ohm's law: V = I R",
    note: 'The voltage across a resistance is the current through it times the resistance: the foundation of electronic and neural circuits alike.',
    widget: 'elec:ohm',
  },
  {
    say: 'Capacitance is the charge stored for a given voltage',
    note: 'C = Q / V, measured in farads (F): how much the charge changes in response to a difference in electrical potential energy. Neuronal membranes act as capacitors.',
    widget: 'elec:capacitance',
  },
  {
    say: 'Power is the rate at which energy is transferred',
    note: 'P = W / t = (W / Q) × (Q / t) = V I, measured in watts (W). It bears on the metabolic cost of neural activity.',
    widget: 'elec:power',
  },
  {
    say: 'An electrical circuit is a closed path that lets charge flow under an applied voltage',
    widget: 'elec:circuit',
  },
  {
    say: 'A battery is a voltage source',
    note: 'In a neuron, the ion concentration gradients across the membrane act as batteries.',
    widget: 'elec:battery',
  },
  {
    say: 'A resistor provides resistance',
    note: "In a neuron, the membrane's ion channels, and the fluid along the inside, resist the current.",
    widget: 'elec:resistor',
  },
  {
    say: 'A capacitor stores charge',
    note: 'In a neuron, the membrane stores charge either side of it: it is a capacitor.',
    widget: 'elec:capacitor',
  },
  {
    say: 'A switch opens and closes the circuit',
    note: 'In a neuron, ion channels gate, opening and closing like switches. Mind the words: a closed switch lets current through, as an open channel does.',
    widget: 'elec:switch',
  },
  {
    say: 'In a parallel circuit, components sit side by side',
    note: 'Each has the same voltage across it, and their currents add up. So conductances in parallel add, too.',
    widget: 'elec:parallel',
  },
  {
    say: 'In a series circuit, components sit one after another',
    note: 'The same current flows through each, and their voltages add up. So resistances in series add, too.',
    widget: 'elec:series',
  },
  {
    say: 'An RC circuit joins a resistor (R) and a capacitor (C)',
    note: "It is the basic electrical model of a neuron's membrane.",
    widget: 'elec:rc',
  },
  {
    say: "Kirchhoff's voltage law: the voltages around any closed loop sum to zero",
    note: "Going round the RC circuit, the voltage the source supplies is used up across the resistor and the capacitor: the source's voltage equals the two added together.",
    widget: 'elec:kirchhoff',
  },
  {
    say: 'A capacitor charges asymptotically',
    note: "Its voltage rises quickly at first, then ever more slowly, approaching the source's voltage but never quite reaching it. This governs how fast neurons respond to input.",
    widget: 'elec:charging',
  },
  {
    say: "The RC time constant, τ = RC, defines the speed of the membrane's response",
    note: 'It is the time a capacitor takes to charge to 63.2% of an applied voltage, or to discharge to 36.8%.',
    widget: 'elec:tau',
  },
  {
    say: 'Cable theory treats a dendrite or an axon as a chain of RC circuits',
    note: 'Each patch of membrane is an RC circuit, joined to the next by the axial resistance inside. Current leaks out as it spreads, so a voltage fades with distance: to 37% over one length constant, λ.',
    widget: 'elec:cable',
  },
  {
    say: 'An electric field pushes on charges: F = q E',
    note: 'q is the charge and E the electric field. It governs how charged particles, such as the protons and electrons we met earlier, move: positive charges along the field, negative ones against it.',
    widget: 'elec:field',
  },
  {
    say: 'Next, see these ideas at work in a neuron',
    widget: 'elec:field',
    cta: { course: 'electrical-physics', label: 'The electrical physics of a neuron' },
  },
];
