import type { Slide } from '@/features/learn/components/walkthrough/Walkthrough';

/**
 * The electrical physics of a neuron, a second take, drawn as the basic
 * electrical physics course draws its membrane and ions: the membrane of
 * lipids, the inside it separates from the outside, and the ions in both; how
 * charges push and pull, and how that keeps both sides neutral; then potassium:
 * its concentrations, its channels, open and closed, and its passing through them.
 */
export const ELECTRICAL_PHYSICS_SLIDES: Slide[] = [
  {
    say: 'Neurons have a cell membrane made of "lipids" (i.e. fat molecules)',
    widget: 'physics2:lipids',
  },
  {
    say: 'The cell membrane separates the inside "cytoplasm" of the neuron from the outside "extracellular" space',
    widget: 'physics2:membrane',
  },
  {
    say: 'The inside and outside of the cell are filled with water: electrically neutral H₂O molecules',
    widget: 'physics2:water',
  },
  {
    say: 'Positive and negative ions also exist both inside and outside the cell',
    widget: 'physics2:charges',
  },
  {
    say: 'The cell membrane stops ions and molecules passing through',
    widget: 'physics2:barrier',
  },
  {
    say: 'From electrical physics, like charges repel and opposite charges attract',
    widget: 'physics2:forces',
  },
  {
    say: 'If there is a charge imbalance, this attraction and repulsion will cause charges to flow and rebalance each other',
    widget: 'physics2:flow',
  },
  {
    say: 'This keeps the balance of electrical charge neutral on the inside and outside of the cell',
    widget: 'physics2:neutral',
  },
  {
    say: "Let's consider the potassium ions",
    widget: 'physics2:potassium',
  },
  {
    say: 'There are about 28 times more potassium ions on the inside of the cell than the outside',
    widget: 'physics2:gradient',
  },
  {
    say: 'Channels exist in the membrane which allow ions of a particular type to pass through',
    widget: 'physics2:channels',
  },
  {
    say: 'These "ion channels" have both an open and closed state',
    widget: 'physics2:gating',
  },
  {
    say: 'When an ion channel selective for potassium ions is open, potassium ions can pass through the channel',
    widget: 'physics2:diffusion',
  },
  {
    say: 'First we will consider "passive channels" which remain open with essentially constant permeability',
    widget: 'physics2:passive',
  },
  {
    say: 'Ions are constantly moving about randomly, and bumping into other ions and water molecules',
    widget: 'physics2:moving',
  },
  {
    say: 'As there are more potassium ions on the inside of the cell, potassium ions are more likely to move through open potassium channels from the inside to outside through this random movement, than vice versa',
    widget: 'physics2:random',
  },
  {
    say: 'This leads to a net movement of potassium ions from the inside to the outside of the cell',
    widget: 'physics2:net',
  },
  {
    say: 'This process (the movement of ions from an area of high concentration to an area of low concentration) is known as diffusion',
    widget: 'physics2:term',
  },
  {
    say: 'If the potassium ions were not charged, this would lead to the concentrations of potassium ions equaling out over time',
    widget: 'physics2:uncharged',
  },
  {
    say: 'But as ions are electrically charged, something very different happens',
    widget: 'physics2:charged',
  },
  {
    say: 'When a single potassium ion leaves the cell, this creates a charge imbalance both inside and outside of the cell',
    widget: 'physics2:imbalance',
  },
  {
    say: 'That is, outside the cell there is one more positive charge than negative',
    widget: 'physics2:moreOut',
  },
  {
    say: 'And inside, there is one more negative charge than positive',
    widget: 'physics2:moreIn',
  },
  {
    say: 'These surplus positive and negatively charged ions then attract each other to the membrane of the cell',
    widget: 'physics2:attract',
  },
  {
    say: 'The positive potassium ion has an electrical force field repelling positive ions',
    widget: 'physics2:fieldK',
  },
  {
    say: 'An electric field at any point in space is defined as the force experienced by a single unit of positive charge',
    widget: 'physics2:fieldDef',
  },
  {
    say: 'The negative ion has an electrical field attracting positive ions',
    widget: 'physics2:fieldN',
  },
  {
    say: 'Together these create a force field across the membrane, repelling positive charges',
    widget: 'physics2:across',
  },
  {
    say: 'With lots of these pairs close to the membrane, an electric field is created across it, including inside the ion channel',
    widget: 'physics2:sheet',
  },
  {
    say: 'This field pushes potassium ions back into the cell, making it harder for them to leave the cell',
    widget: 'physics2:pushed',
  },
  {
    say: 'As more potassium ions flow out, the more they collect on the membrane, and the stronger the electric field across the membrane',
    widget: 'physics2:stronger',
  },
  {
    say: 'The outward flow of potassium ions through diffusion and the strength of the electrical field eventually balance out, such that there is no net flow of potassium ions',
    widget: 'physics2:balance',
  },
  {
    say: 'The higher the concentration of potassium on the inside of the cell relative to the outside, the greater the rate of diffusion\n\nThis leads to a greater charge build up and a stronger electric field across the membrane',
    widget: 'physics2:determine',
  },
  {
    say: 'We consider the voltage between the inside and outside of the cell created by the electric field',
    widget: 'physics2:voltage',
  },
  {
    say: 'A voltage is defined as the work done (energy) needed to move a unit of charge from one point to another\n\nVoltage is measured in volts, where 1 volt equals 1 joule per coulomb of charge',
    widget: 'physics2:volts',
  },
  {
    say: 'The membrane potential is defined as the work done needed to move a positive charge from the outside to the inside of the cell',
    widget: 'physics2:potential',
  },
  {
    say: 'With an electric field driving potassium ions into the cell, no energy is needed for a positive potassium ion to enter the cell.\n\nIn fact energy is released',
    widget: 'physics2:freeIn',
  },
  {
    say: 'Therefore the membrane potential (work done per unit charge to move a positive ion into the cell) is negative',
    widget: 'physics2:negative',
  },
  {
    say: 'Therefore, a surplus negative charge inside the cell corresponds with a negative membrane potential (voltage)',
    widget: 'physics2:surplus',
  },
  {
    say: 'Another way in which the membrane potential is defined is as a difference in potential energy between the inside and outside of the cell',
    widget: 'physics2:potentialEnergy',
  },
  {
    say: 'A positive charge outside the membrane has potential energy to be released, whereas a positive charge within the cell does not',
    widget: 'physics2:stored',
  },
  {
    say: 'This difference in potential energy: ((potential energy inside) − (potential energy outside)) / unit charge also gives the membrane potential voltage',
    widget: 'physics2:perCharge',
  },
  {
    say: 'The membrane potential at which the outward flow of potassium ions is balanced by the repulsive electrical force is called the reversal or equilibrium potential',
    widget: 'physics2:equilibrium',
  },
  {
    say: 'The reversal potential is negative as the electrical force opposes the outward flow of positively charged potassium ions and attracts them back into the cell',
    widget: 'physics2:reversal',
  },
  {
    say: 'That is, energy is released when potassium ions move into the cell, and energy is needed to move them out',
    widget: 'physics2:energy',
  },
  {
    say: 'Potassium ions will move according to this equilibrium potential, with no net flow when the membrane voltage equals this potential',
    widget: 'physics2:noNet',
  },
  {
    say: 'This equilibrium potential is specific to potassium because it depends on the concentration gradient of potassium across the membrane',
    widget: 'physics2:specific',
  },
  {
    say: 'If the membrane potential is different from the equilibrium potential, there will be a net flow of potassium ions either into or out of the cell',
    widget: 'physics2:differs',
  },
  {
    say: 'For example, if the membrane potential is less negative than the equilibrium potential, potassium ions will flow out of the cell (decreasing the membrane potential reducing positive charge inside) until the membrane potential reaches the equilibrium potential',
    widget: 'physics2:example',
  },
  {
    say: 'As we saw earlier, however there are different types of ion inside and outside of the cell',
    widget: 'physics2:kinds',
  },
  {
    say: 'These each have different charges and different concentrations inside and outside of the cell',
    widget: 'physics2:each',
  },
  {
    say: 'Therefore their ion channels have different reversal potentials',
    widget: 'physics2:reversals',
  },
  {
    say: "These different reversal potentials drive the cell's membrane potential in different directions but balance out at the resting potential",
    widget: 'physics2:pulls',
  },
  {
    say: "This resting potential is an average of the reversal potentials, weighted by each ion's permeability: how easily it crosses the membrane",
    widget: 'physics2:weighted',
  },
  {
    say: 'At rest the permeability of potassium ions is much greater than sodium so the membrane potential sits closer to the potassium reversal potential, typically around −70 mV',
    widget: 'physics2:nearer',
  },
  {
    say: 'We can now consider what happens when a signal arrives from another neuron',
    widget: 'physics2:signal',
  },
  {
    say: 'Two neurons can be connected via a chemical synapse',
    widget: 'physics2:synapse',
  },
  {
    say: 'When a signal arrives at the presynaptic terminal, neurotransmitters are released, which bind to receptors in the postsynaptic neurons',
    widget: 'physics2:release',
  },
  {
    say: 'This opens ion channels in the receptors which selectively let ions flow into the cell',
    widget: 'physics2:inflow',
  },
  {
    say: 'Glutamate is a neurotransmitter which binds to AMPA and NMDA receptors, both of which are selective for cations (positive ions)',
    widget: 'physics2:glutamate',
  },
  {
    say: 'AMPA receptors are selective for both Na⁺ and K⁺, and act similarly to the passive ion channels we saw earlier once activated, allowing sodium to flow in and potassium to flow out with similar permeability',
    widget: 'physics2:ampa',
  },
  {
    say: 'Na⁺ wants to flow in (toward +60 mV) and K⁺ wants to flow out (toward −90 mV). The reversal potential is where these two currents cancel. With roughly equal permeability, that’s a voltage between the two, close to 0 mV',
    widget: 'physics2:cancel',
  },
  {
    say: 'The influx of positive ions drives the membrane potential up in the vicinity of the synapse, as excess positive charge collects on the membrane, pushing away some positive charge on the outside of the cell',
    widget: 'physics2:excess',
  },
  {
    say: 'The extra positive charge also repels nearby positive ions, mainly K⁺, which is the most abundant cation inside',
    widget: 'physics2:repel',
  },
  {
    say: 'These cations in turn repel other cations, leading to a net flow of cations along the dendrite, with the cations accumulating on the membrane to also drive the membrane potential up',
    widget: 'physics2:along',
  },
  {
    say: 'The cations also leak out through ion channels meaning that the propagation of positive charge gradually decays',
    widget: 'physics2:decay',
  },
  {
    say: 'Glutamate is cleared quickly. After release, glutamate diffuses out of the cleft and is taken up by transporters within about 1 ms',
    widget: 'physics2:clearance',
  },
  {
    say: 'Fast unbinding (deactivation): once glutamate drops, it comes off the receptor quickly and the channel closes, over about 1 to 3 ms',
    widget: 'physics2:deactivation',
  },
  {
    say: 'Desensitization: if glutamate lingers, AMPA receptors close anyway within a few to about 10 ms, and stay unresponsive for a while',
    widget: 'physics2:desensitize',
  },
  {
    say: 'Synapse type: some auditory brainstem synapses, built for precise timing, have decays under 1 ms. Many cortical and hippocampal synapses are around 2 to 5 ms',
    note: 'Subunits and auxiliary proteins (such as TARPs) change opening and desensitization rates. Temperature: everything is faster at body temperature than in many room-temperature lab recordings',
    widget: 'physics2:factors',
  },
  {
    say: 'Charging the capacitance takes time, so the voltage doesn’t follow the brief AMPA current instantly. The membrane time constant τ = rₘ × cₘ sets how fast the voltage rises and decays, typically about 10 to 30 ms',
    widget: 'physics2:tau',
  },

  // {
  //   say: 'The number of potassium ions at the membrane and thus the voltage and strength of the electric field depend on the concentrations of potassium ions inside and outside the cell',
  //   note: 'As we will see, the brain controls the concentrations of ions inside and outside of cells, such that they stay constant over time.',
  //   widget: 'physics2:depends',
  // }
];
