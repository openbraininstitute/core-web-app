import type { Slide } from '@/features/learn/components/walkthrough/Walkthrough';

/**
 * Two simulators of detailed neurons, and how they differ: first what any
 * such simulator does — compartments, coupled by the current between them,
 * stepped implicitly, solved by the Hines algorithm — then NEURON, its NMODL
 * channels, its circuits across processors and its gradient-free fitting;
 * then Jaxley, the same models in JAX, giving the same voltages, with
 * gradients, gradient descent and many simulations at once; side by side;
 * and which the Open Brain Platform uses. Every piece of code shown was run,
 * and what it printed is what is shown.
 */
export const NEURON_VS_JAXLEY_SLIDES: Slide[] = [
  {
    say: 'NEURON and Jaxley both simulate neurons in full detail',
    note: 'Both solve the equations from the physics course for every piece of a neuron, like this cell, simulated in this page. They are built differently, and so they make different things easy.',
    widget: 'jaxley:cell',
  },
  {
    say: 'First, the neuron is cut into compartments',
    note: 'Each is a short piece of branch, small enough to have one voltage: a patch of membrane, with its capacitor and its channels. This cell has 365, each about 30 µm long.',
    widget: 'jaxley:split',
  },
  {
    say: "Each compartment's voltage depends on its neighbours'",
    note: 'Current flows between neighbouring compartments through the fluid inside, from the higher voltage to the lower. So no compartment can be worked out on its own: their equations are coupled.',
    widget: 'jaxley:spread',
  },
  {
    say: 'Stepping them forward one at a time can blow up',
    note: 'Time advances in small steps. Forward Euler works out each new voltage from the last ones alone, and with compartments this short it needs steps under 0.004 ms. Backward Euler, which solves for all the new voltages together, is stable whatever the step.',
    widget: 'jaxley:stiff',
  },
  {
    say: 'Solving for every voltage at once is quick, because a neuron is a tree',
    note: 'Each step is a set of equations, one per compartment. Worked from the tips in to the soma and back out, they take time in proportion to the number of compartments: the Hines algorithm, from 1984. NEURON uses it; Jaxley schedules it to work on many branches at once.',
    widget: 'jaxley:matrix',
  },
  {
    say: 'NEURON has been the standard simulator for decades',
    note: 'Begun by Michael Hines in the 1980s, it is written in C and C++ and driven from Python: build a cell from sections, insert channels, add an electrode, and run it.',
    widget: 'jaxley:neuron',
  },
  {
    say: "NEURON's channels are written in NMODL",
    note: "A small language of equations: what a channel conducts, its gates, and how they change with the voltage. nrnivmodl translates each file to C++ and compiles it into the cell. The platform's e-models come with theirs.",
    widget: 'jaxley:nmodl',
  },
  {
    say: 'For circuits, NEURON shares the cells out between processors',
    note: "Each processor simulates its own cells, and they swap spikes over MPI. CoreNEURON, NEURON's engine for big runs, can use GPUs too. The platform runs its simulations this way, with neurodamus setting NEURON up from a circuit's files.",
    widget: 'jaxley:circuits',
  },
  {
    say: 'Fitting a model to a recording is a search',
    note: "Which conductances make the model's spike match the recorded one? Here, how far off each pair of values is, from 1,681 simulations. Without gradients, you try candidates and keep the best: the platform builds its e-models this way, with BluePyOpt.",
    widget: 'jaxley:search',
  },
  {
    say: 'Jaxley builds the same kind of model in Python, on JAX',
    note: "JAX is Google's library for machine learning: it can differentiate code, compile it and run it on GPUs. Jaxley, from Jakob Macke's lab in Tübingen, simulates neurons with it.",
    widget: 'jaxley:jaxley',
  },
  {
    say: 'Given the same cell, they give the same voltages',
    note: "Both step by backward Euler. NEURON's hh channel looks its rates up in a table, which shifts the spike a little; computed exactly, the two agree to a hundred-billionth of a millivolt.",
    widget: 'jaxley:same',
  },
  {
    say: "Jaxley's channels are written in Python",
    note: 'The same channel both ways: its parameters, its gate and its current. To run a NEURON model in Jaxley, its NMODL files have to be rewritten or translated; the jaxley-mech package collects channels already done.',
    widget: 'jaxley:channel',
  },
  {
    say: 'Jaxley can compute the gradient',
    note: 'Because every step is written in JAX, it can work back through a simulation, by backpropagation, the method that trains deep networks. That gives the slope of the loss for every parameter at once, at the cost of 3 to 20 simulations.',
    widget: 'jaxley:gradient',
  },
  {
    say: 'So a model can be fitted by walking downhill',
    note: 'Each step follows the slope towards a better fit. With two parameters, the search did about as well; but the gradient costs the same however many parameters there are, while a search needs ever more simulations.',
    widget: 'jaxley:descent',
  },
  {
    say: 'In code: make parameters trainable, then follow the gradient',
    note: "jax.value_and_grad gives the loss and its gradient together, and optax takes the steps: from the wrong start to the recording's values in 100 steps.",
    widget: 'jaxley:fit',
  },
  {
    say: 'And it can run many simulations as one',
    note: 'vmap turns a function that simulates one model into one that simulates many, and jit compiles it. On a GPU, the Jaxley paper found this about a hundred times faster than NEURON on a CPU.',
    widget: 'jaxley:sweep',
  },
  {
    say: 'Gradients make models with thousands of parameters trainable',
    note: 'As the parameters multiply, a search needs ever more simulations, but a gradient still costs only a few.',
    widget: 'jaxley:scale',
  },
  {
    say: 'Each is built for a different job',
    note: 'NEURON: decades of models, channels in NMODL, circuits across many processors. Jaxley: gradients, and many simulations at once on a GPU.',
    widget: 'jaxley:compare',
  },
  {
    say: 'On the Open Brain Platform, simulations run in NEURON',
    note: "Single neurons, synaptomes and circuits are simulated with neurodamus and NEURON, and e-models are fitted with BluePyOpt's searches. Jaxley is not part of the platform's workflows; it is being tried out in notebooks.",
    widget: 'jaxley:platform',
  },
  {
    say: 'Next, a tour of the platform itself',
    widget: 'jaxley:platform',
    cta: { course: 'platform', label: 'Introduction to the platform' },
  },
];
