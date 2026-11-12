import type { Slide } from '@/features/learn/components/walkthrough/Walkthrough';

/**
 * A basic introduction to compartmental modeling: how the electrical physics of a single neuron becomes a model a
 * computer can run. One patch of membrane as a circuit and its equation; the neuron cut into compartments, joined by
 * the cytoplasm's resistance; voltage-gated channels and synapses as conductances; how the equations are stepped
 * through time.
 */
export const COMPARTMENTAL_MODELING_SLIDES: Slide[] = [
  {
    say: 'A compartmental model writes the electrical physics of a neuron down as equations, which a computer steps through time',
    note: 'It starts from one small patch of membrane',
    section: 'One patch of membrane',
    widget: 'physics:zoom',
  },
  {
    say: 'The membrane holds charge apart, so it is a capacitor: the charge it holds is Q = C × V',
    note: 'Its capacitance per area, about 1 µF/cm², is much the same in every neuron',
    widget: 'physics:capacitor',
  },
  {
    say: 'Each kind of open ion channel is a conductance, g: the more channels are open, the more current flows',
    widget: 'physics:conductance',
  },
  {
    say: 'Its current is set by Ohm’s law, from how far the voltage is from the ion’s reversal potential: I = g × (V − E)',
    widget: 'physics:driving',
  },
  {
    say: 'With no current injected, the voltage settles where the ions’ currents cancel: the resting potential',
    widget: 'physics:rest',
  },
  {
    say: 'Together they make the membrane’s circuit: the capacitor, in parallel with a branch for each kind of ion, a conductance and a battery, its reversal potential',
    widget: 'physics:circuit',
  },
  {
    say: 'Inject a current, and the voltage moves to a new level along a curve, 63% of the way in one time constant, τ = R × C',
    note: 'The charge on the capacitor changes by the current that flows into it: C × dV/dt = I − Σ g × (V − E). This is the equation the computer steps through',
    widget: 'physics:rc',
  },
  {
    say: 'But a neuron is far bigger than one patch: its dendrites and axon are long, thin, branching cables',
    section: 'Compartments',
    widget: 'jaxley:cell',
  },
  {
    say: 'So the model cuts it into compartments, each short enough that its voltage is about the same all along it',
    note: 'Each compartment is a patch of membrane with a circuit of its own. Its area, from its length and diameter, sets its capacitance and its conductances',
    widget: 'jaxley:split',
  },
  {
    say: 'Neighbouring compartments are joined through the cytoplasm by an axial resistance, the larger the longer and thinner the piece',
    widget: 'physics:cable',
  },
  {
    say: 'That resistance is R = Rᵢ × l / A: the cytoplasm’s resistivity Rᵢ, about 100 Ω·cm, times the distance l between the two compartments’ middles, over the dendrite’s cross-section A = π (d/2)²',
    note: 'For compartments 55 µm long in a dendrite 1 µm across, it comes to about 70 MΩ',
    widget: 'compartmental:resistance',
  },
  {
    say: 'The current between two neighbours then follows Ohm’s law: I = (V₁ − V₂) / R, from the higher voltage to the lower',
    note: 'A difference of 10 mV across 70 MΩ drives about 0.14 nA',
    widget: 'compartmental:axial',
  },
  {
    say: 'Each compartment adds up the currents from its neighbours with those through its channels and from any electrode: together they set how fast its voltage changes',
    note: 'C × dV/dt = Σ (V_neighbour − V) / R − Σ g × (V − E) + I_injected, where C is the compartment’s capacitance: about 1 µF/cm² times its area',
    widget: 'compartmental:sum',
  },
  {
    say: 'So each compartment’s voltage depends on its neighbours’, and theirs on their neighbours’, all along the neuron',
    note: 'Together, the compartments’ equations are the cable equation, cut into pieces',
    widget: 'jaxley:spread',
  },
  {
    say: 'Current injected into one compartment spreads into the rest, and the voltage fades with distance, over a length constant λ',
    widget: 'physics:length',
  },
  {
    say: 'Try it: a neuron of 20 compartments. Inject current into it, and watch where the voltage goes',
    widget: 'neuron',
  },
  {
    say: 'Voltage-gated channels are conductances that change with the voltage. Hodgkin and Huxley wrote sodium’s as ḡ × m³h, and potassium’s as ḡ × n⁴',
    note: 'ḡ is the conductance with every gate open. Each gate, m, h and n, is a number from 0 to 1 that opens and shuts at rates set by the voltage, by an equation of its own',
    section: 'Active channels and synapses',
    widget: 'physics:gated',
  },
  {
    say: 'With them in the equations, the model makes action potentials, which spread from compartment to compartment',
    widget: 'physics:spike',
  },
  {
    say: 'A synapse is one more conductance: it opens briefly when a spike arrives from another neuron, and has its own reversal potential, about 0 mV for AMPA receptors',
    widget: 'physics2:glutamate',
  },
  {
    say: 'So each compartment has one equation: the current charging its capacitance is the sum of its channels’ currents, its neighbours’ and any injected',
    widget: 'physics:equation',
  },
  {
    say: 'To step the equations through time, the simplest way is forward Euler: take each voltage’s rate of change now, and follow it for one step: V(t + Δt) = V(t) + Δt × dV/dt',
    section: 'Solving the equations',
    widget: 'compartmental:forward',
  },
  {
    say: 'That works only while the step is short beside the fastest time constant. A longer step overshoots, further each time, and the simulation blows up',
    widget: 'compartmental:overshoot',
  },
  {
    say: 'A neuron’s compartments are short and tightly coupled, so their fastest time constants are tiny, and forward Euler needs very short steps',
    widget: 'jaxley:stiff',
  },
  {
    say: 'Backward Euler takes the rate of change at the end of the step instead, at the new voltage it is solving for. It never overshoots, however long the step, though long steps still lose accuracy',
    widget: 'compartmental:backward',
  },
  {
    say: 'The new voltages are then on both sides of the equations, so each step solves for every compartment’s at once. Because a neuron is a tree, that is quick: the Hines algorithm',
    widget: 'jaxley:matrix',
  },
];
