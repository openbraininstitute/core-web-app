import type { SlideTerm } from '@/features/learn/components/walkthrough/Terms';

/**
 * The electrical terms "The electrical physics of a neuron" explains in pop-ups from its titles: what
 * each means, and the simple equations it is in, written as the "Basic electrical physics" course
 * writes them. The numbers are this course's own: potassium at 140 mM inside and 5 mM outside, so
 * E_K is −89 mV at body temperature, and moving one K⁺ ion across it takes 1.43 × 10⁻²⁰ J.
 */
export const ELECTRICAL_TERMS: SlideTerm[] = [
  {
    name: 'Charge',
    forms: [
      'charge',
      'charges',
      'charged',
      'charging',
      'electric charge',
      'electric charges',
      'electrical charge',
      'electrical charges',
      'electrically charged',
    ],
    means:
      'A basic property of matter, written q or Q, that comes in two kinds, positive and negative: like charges repel and opposite charges attract. Measured in coulombs (C). A proton carries +1.602 × 10^{−19} C and an electron the same but negative, so every ion’s charge is a whole number of these.',
    equations: [
      {
        formula: 'q = z e',
        says: 'An ion’s charge q is its charge number z (+1 for K⁺ and Na⁺, +2 for Ca²⁺, −1 for Cl⁻) times e = 1.602 × 10^{−19} C, the charge of one proton.',
      },
      {
        formula: 'F = k q_{1} q_{2} / r^{2}',
        says: 'Coulomb’s law: the force F between two charges q_{1} and q_{2} a distance r apart, repelling if they are alike and attracting if opposite; k = 8.99 × 10^{9} N m^{2}/C^{2}.',
      },
      {
        formula: 'Q = C V',
        says: 'A capacitor such as the membrane holds a charge Q on each face for a voltage V across it, C being its capacitance: the more charge builds up on the membrane, the larger the voltage across it.',
      },
    ],
  },
  {
    name: 'Voltage',
    forms: ['voltage', 'voltages', 'potential difference', 'potential differences'],
    means:
      'The work needed to move a unit of charge from one point to another: the difference in electrical potential energy, per unit of charge, between the two points. Measured in volts (V).',
    equations: [
      {
        formula: 'V = W / q',
        says: 'The work W, in joules, needed to move a charge q, in coulombs, divided by the charge. One K⁺ ion (1.602 × 10^{−19} C) moved across 89 mV takes W = q V = 1.43 × 10^{−20} J.',
      },
      {
        formula: 'E = V / d',
        says: 'The voltage V across a gap d sets the electric field E in it, as between the two sheets of charge lining the membrane: 89 mV across a membrane about 5 nm thick is a field of about 18 million V/m.',
      },
      {
        formula: 'V = I R',
        says: 'Ohm’s law: a voltage V across a resistance R, in ohms (Ω), drives a current I, in amperes (A), through it.',
      },
    ],
  },
  {
    name: 'Work done',
    forms: ['work done'],
    means:
      'The energy transferred when a force moves something through a distance. Moving a charge against an electric field takes work, which is stored as electrical potential energy; letting the field move it gives that energy back. Measured in joules (J).',
    equations: [
      {
        formula: 'W = F × d',
        says: 'A force F, in newtons, moving something a distance d, in metres, in the direction it pushes, does work W, in joules.',
      },
      {
        formula: 'W = q V',
        says: 'Moving a charge q through a voltage V takes work W: one K⁺ ion (1.602 × 10^{−19} C) across the membrane’s 89 mV takes 1.43 × 10^{−20} J.',
      },
      {
        formula: 'W = q E d',
        says: 'In an even field E, like the one across the membrane, the force on a charge q is q E, so carrying it a distance d across the field takes q E d: the same as q V, since the voltage across the gap is V = E d.',
      },
    ],
  },
  {
    name: 'Energy',
    forms: [
      'energy',
      'energies',
      'potential energy',
      'potential energies',
      'electrical potential energy',
    ],
    means:
      'The capacity to do work, measured in joules (J). It is never made or destroyed, only moved or changed from one form to another: the work done moving a charge against an electric field is stored as electrical potential energy, and given back when the field moves the charge the other way.',
    equations: [
      {
        formula: 'W = ΔU',
        says: 'The work W done on something is the change ΔU in its energy: work done moving a charge against a field raises its potential energy by that much.',
      },
      {
        formula: 'U = q V',
        says: 'A charge q where the electric potential is V has electrical potential energy U. A K⁺ ion moving into the cell, from 0 mV outside to −89 mV inside, gives up 1.43 × 10^{−20} J; moving it out takes as much.',
      },
      {
        formula: 'P = W / t = V I',
        says: 'Power P, the rate at which energy is transferred, in watts (joules per second): a current I through a voltage V transfers V I.',
      },
    ],
  },
  {
    name: 'Membrane potential',
    forms: ['membrane potential', 'membrane potentials', 'membrane voltage', 'membrane voltages'],
    means:
      'The voltage across a cell’s membrane: the electrical potential inside the cell relative to outside. It comes from the thin layers of opposite charge lining the membrane’s two faces, and in a neuron at rest is typically around −70 mV.',
    equations: [
      {
        formula: 'V_{m} = V_{in} − V_{out}',
        says: 'The potential inside minus the potential outside: negative when the inside is the more negative, as at rest.',
      },
      {
        formula: 'W = q V_{m}',
        says: 'The work W needed to move a charge q from the outside to the inside. For a positive ion, with V_{m} negative, it is negative: energy is released as the ion moves in, and needed to move it out.',
      },
      {
        formula: 'Q = C V_{m}',
        says: 'The charge Q lining each face of the membrane, which acts as a capacitor of capacitance C, about 1 µF for each square centimetre: the more charge lines it, the larger the membrane potential.',
      },
    ],
  },
  {
    name: 'Electric field',
    forms: [
      'electric field',
      'electric fields',
      'electrical field',
      'electrical fields',
      'electrical force field',
      'electrical force fields',
      'force field',
      'force fields',
    ],
    means:
      'The push or pull that charges exert on other charges around them: at each point, the force a single unit of positive charge would feel there, with a strength and a direction. Positive charges are pushed along it, negative ones against it. Measured in volts per metre (V/m), the same as newtons per coulomb.',
    equations: [
      {
        formula: 'F = q E',
        says: 'A charge q, in coulombs, in an electric field E feels a force F, in newtons: the field is the force per unit of charge, E = F / q.',
      },
      {
        formula: 'E = k Q / r^{2}',
        says: 'Around a single charge Q, the field weakens with the square of the distance r from it; k = 8.99 × 10^{9} N m^{2}/C^{2}.',
      },
      {
        formula: 'E = V / d',
        says: 'Between two sheets of opposite charge, like those lining the membrane, the field is even: the voltage V across them divided by the gap d. 89 mV across 5 nm is about 18 million V/m.',
      },
    ],
  },
  {
    name: 'Concentration',
    forms: ['concentration', 'concentrations'],
    means:
      'How much of a substance there is in a given volume. Ions’ concentrations are given in millimoles per litre (mM), a millimole being about 6 × 10^{20} ions: a neuron has about 140 mM of potassium inside and 5 mM outside.',
    equations: [
      {
        formula: 'J = −D Δc / Δx',
        says: 'Fick’s law of diffusion: particles flow from high concentration c to low, J of them through each unit of area every second, the faster the more steeply c falls over a distance x. D says how quickly they diffuse.',
      },
      {
        formula: 'E_{K} = 26.7 mV × ln([K⁺]_{out} / [K⁺]_{in})',
        says: 'The Nernst equation: the membrane potential E_{K} at which the electric field balances potassium’s diffusion out, its equilibrium potential. 26.7 mV is kT/e, the ions’ thermal energy per unit of charge at body temperature, so 5 mM outside and 140 mM inside give −89 mV.',
      },
    ],
  },
  {
    name: 'Diffusion',
    forms: ['diffusion', 'diffuse', 'diffuses', 'diffused', 'diffusing'],
    means:
      'The net movement of particles from where they are more concentrated to where they are less, by their random motion alone: each particle wanders at random, but where there are more of them, more happen to wander away.',
    equations: [
      {
        formula: 'J = −D Δc / Δx',
        says: 'Fick’s law: the net flow J, through each unit of area every second, runs from high concentration c to low, the faster the more steeply c falls over a distance x. D, the diffusion coefficient, says how quickly the particles wander.',
      },
      {
        formula: 'J = P (c_{in} − c_{out})',
        says: 'Through a membrane, the net outward flow of a particle without charge: the membrane’s permeability P to it times the difference in its concentration across it. An ion is pushed by the electric field across the membrane as well.',
      },
      {
        formula: 'E_{K} = 26.7 mV × ln([K⁺]_{out} / [K⁺]_{in})',
        says: 'The Nernst equation: potassium’s diffusion out is balanced by the field pushing it back once the membrane potential reaches E_{K}, −89 mV for 140 mM inside and 5 mM outside.',
      },
    ],
  },
  {
    name: 'Ion',
    forms: ['ion', 'ions', 'cation', 'cations', 'anion', 'anions'],
    means:
      'An atom or molecule with an electric charge, from having lost or gained electrons. Positive ions, cations, have lost electrons, as potassium (K⁺), sodium (Na⁺) and calcium (Ca²⁺) have; negative ions, anions, have gained them, as chloride (Cl⁻) has.',
    equations: [
      {
        formula: 'q = z e',
        says: 'An ion’s charge q is its charge number z (+1 for K⁺ and Na⁺, +2 for Ca²⁺, −1 for Cl⁻) times the charge of one proton, e = 1.602 × 10^{−19} C.',
      },
      {
        formula: 'F = k q_{1} q_{2} / r^{2}',
        says: 'Coulomb’s law: two ions push apart if their charges are alike and pull together if they are opposite, with a force F that weakens with the square of the distance r between them.',
      },
      {
        formula: 'W = q V',
        says: 'Moving an ion of charge q through a voltage V takes work W: 1.43 × 10^{−20} J for one K⁺ ion across 89 mV.',
      },
    ],
  },
  {
    name: 'Volt',
    forms: ['volt', 'volts', 'millivolt', 'millivolts'],
    means:
      'The unit of voltage, written V: one volt is one joule of work per coulomb of charge. A neuron’s voltages are thousandths of a volt, millivolts (mV).',
    equations: [
      {
        formula: '1 V = 1 J / C',
        says: 'From V = W / q: a joule of work for each coulomb of charge moved.',
      },
      {
        formula: '1 V = 1 A × 1 Ω',
        says: 'From Ohm’s law, V = I R: an ampere of current through an ohm of resistance.',
      },
      {
        formula: '1 mV = 0.001 V',
        says: 'So potassium’s equilibrium potential, −89 mV, is −0.089 V.',
      },
    ],
  },
  {
    name: 'Coulomb',
    forms: ['coulomb', 'coulombs'],
    means:
      'The unit of electric charge, written C: the charge of about 6.24 × 10^{18} protons. One proton, or one K⁺ ion, carries e = 1.602 × 10^{−19} C.',
    equations: [
      {
        formula: 'I = Q / t',
        says: 'Current I is the charge Q that flows past a point in a time t, divided by that time: an ampere is a coulomb each second.',
      },
      {
        formula: 'W = q V',
        says: 'Moving a coulomb of charge through a volt takes a joule of work: 1 J = 1 C × 1 V.',
      },
      {
        formula: 'F = k q_{1} q_{2} / r^{2}',
        says: 'Coulomb’s law, after Charles-Augustin de Coulomb: the force F between charges q_{1} and q_{2}, in coulombs, a distance r apart; k = 8.99 × 10^{9} N m^{2}/C^{2}.',
      },
    ],
  },
  {
    name: 'Current',
    forms: ['current', 'currents'],
    means:
      'The rate at which charge flows past a point, written I and measured in amperes (A): one ampere is one coulomb each second. In wires electrons carry it; in neurons ions do, through open channels across the membrane and along the inside of the cell.',
    equations: [
      {
        formula: 'I = Q / t',
        says: 'The charge Q, in coulombs, that flows past a point in a time t, in seconds, divided by that time.',
      },
      {
        formula: 'I = g (V_{m} − E)',
        says: 'Ohm’s law, V = I R, for the current through a membrane’s open channels: their conductance g (1 / R, in siemens) times the driving force, how far the membrane potential V_{m} is from their reversal potential E. At V_{m} = E no current flows.',
      },
      {
        formula: 'I = C ΔV / Δt',
        says: 'A current I onto the membrane’s capacitance C changes the voltage across it at a rate ΔV / Δt = I / C: the voltage takes time to follow a current.',
      },
    ],
  },
];
