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
    section: 'The membrane',
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
    section: 'Diffusion',
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
    section: 'The membrane electric field',
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
    section: 'The membrane potential',
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
    section: 'Reversal and resting potentials',
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
    say: 'So far the channels have been passive, staying open. But many ion channels are active: they open and shut in response to something',
    section: 'Active ion channels',
    widget: 'physics2:activeChannels',
  },
  {
    say: 'Let’s zoom in on one of them. An ion channel is a protein: a large molecule that spans the membrane, folded around a pore through which ions can pass',
    widget: 'physics2:closeUp',
  },
  {
    say: 'Part of the protein forms a gate across the pore. While the gate is shut, no ions can pass. When it opens, they flow through',
    widget: 'physics2:gate',
  },
  {
    say: 'This one is a voltage-gated sodium channel: it opens in response to the membrane potential. On each side it has a voltage sensor, a part of the protein carrying positive charges, within the membrane',
    widget: 'physics2:sensor',
  },
  {
    say: 'The voltage sensors sit in the electric field across the membrane. At rest, with the inside negative, the field pushes their positive charges inward, and they hold the gate shut',
    widget: 'physics2:held',
  },
  {
    say: 'When the membrane potential rises, there is less negative charge lining the inside of the membrane. The field weakens and no longer holds the sensors in, so they move outward',
    widget: 'physics2:rises',
  },
  {
    say: 'As the sensors move out, they pull the gate open, and sodium ions flow in through the pore. This opening in response is called activation',
    widget: 'physics2:activates',
  },
  {
    say: 'When the membrane potential falls back, the field pushes the sensors back in, and the gate shuts again. This is deactivation, the reverse of activation',
    widget: 'physics2:deactivates',
  },
  {
    say: 'Sodium channels also have a second gate: a loop of the protein, hanging inside the cell',
    widget: 'physics2:secondGate',
  },
  {
    say: 'Soon after the channel opens, this second gate swings into the pore and plugs it. The channel shuts, even though the membrane potential stays up. This is inactivation',
    widget: 'physics2:inactivates',
  },
  {
    say: 'To recover, the membrane potential has to fall back. The sensors return and the first gate shuts, and then, slowly, the plug comes out',
    widget: 'physics2:recovers',
  },
  {
    say: 'Until it has recovered, the channel cannot open again: a second rise in the membrane potential too soon finds it still plugged',
    widget: 'physics2:tooSoon',
  },
  {
    say: 'Other channels are ligand-gated: they open when a particular chemical, a ligand, binds to them. Often the ligand is a neurotransmitter, released by another neuron',
    widget: 'physics2:ligandGated',
  },
  {
    say: 'When the ligand binds, the protein changes shape and the gate opens: the channel activates. When the ligand comes off, the gate shuts again: it deactivates',
    widget: 'physics2:binds',
  },
  {
    say: 'With the ligand still bound, many ligand-gated channels shut anyway after a while: they desensitize. Like inactivation, it takes time to recover from',
    widget: 'physics2:desensitizes',
  },
  {
    say: 'So an active channel moves between three states: closed, open, and inactivated (or, for a ligand-gated channel, desensitized)',
    widget: 'physics2:channelStates',
  },
  {
    say: 'In fact, a channel flicks open and shut at random. A rise in the membrane potential makes it more likely to be open: it raises the channel’s open probability',
    widget: 'physics2:chance',
  },
  {
    say: 'A neuron’s membrane has many such channels. Each opens at random, but together the share of them that are open changes smoothly, and with it how permeable the membrane is to sodium',
    widget: 'physics2:together',
  },
  {
    say: 'The classic way to characterise a channel is a voltage clamp: hold the membrane potential at one level after another, and record the current through the channels at each',
    widget: 'physics2:clamp',
  },
  {
    say: 'Plotting the peak current at each level against the potential gives the channel’s current–voltage, or I–V, curve',
    widget: 'physics2:peakIV',
  },
  {
    say: 'If the channels’ conductance were the same at every potential, as a passive channel’s is, the curve would be a straight line through the reversal potential: Ohm’s law',
    widget: 'physics2:linear',
  },
  {
    say: 'But the share of sodium channels that open rises with the potential: hardly any below −50 mV, about half by 0 mV, and nearly all by +90 mV. The current is that conductance times the driving force, so the curve bends',
    widget: 'physics2:bends',
  },
  {
    say: 'Where the curve crosses zero, the current reverses. This is sodium’s reversal potential, here about +67 mV: below it sodium flows in, above it, out',
    widget: 'physics2:reverses',
  },
  {
    say: 'Neurons signal to one another with brief pulses in their membrane potential, called action potentials, or spikes',
    section: 'The action potential',
    widget: 'physics2:spikes',
  },
  {
    say: 'Close up, each spike is a sudden rise of over 100 mV and a fall back again, all within a couple of milliseconds',
    widget: 'physics2:oneSpike',
  },
  {
    say: 'It starts with inputs from other neurons, at synapses. Each one opens receptor channels for a moment, letting positive ions in, and lifts the membrane potential a little',
    widget: 'physics2:inputs',
  },
  {
    say: 'An input on its own soon fades away. But if enough arrive close together to lift the potential past a threshold, about −55 mV, a spike fires',
    widget: 'physics2:threshold',
  },
  {
    say: 'A spike is all or nothing: a bigger input does not make a bigger spike, only one that comes sooner, and too small an input makes none at all',
    widget: 'physics2:allOrNone',
  },
  {
    say: 'What makes the spike are voltage-gated channels: sodium channels, like the one we zoomed in on, and potassium channels, which open more slowly',
    widget: 'physics2:gated',
  },
  {
    say: 'Past the threshold, sodium channels open and sodium rushes in. That raises the potential further, which opens more of them: a runaway, driving the potential up towards sodium’s reversal potential',
    widget: 'physics2:upstroke',
  },
  {
    say: 'Within a millisecond, the sodium channels inactivate, and the slower potassium channels open. The potential peaks, short of sodium’s reversal potential',
    widget: 'physics2:peak',
  },
  {
    say: 'Potassium flows out, and the potential falls back, for a moment below rest, towards potassium’s reversal potential, until the potassium channels shut again',
    widget: 'physics2:downstroke',
  },
  {
    say: 'For a few milliseconds after, while the sodium channels recover from inactivation, even a strong input cannot fire another spike: the refractory period',
    widget: 'physics2:refractory',
  },
  {
    say: 'So the action potential is a brief spike, about a millisecond long and over 100 mV high: up as sodium flows in, and down as potassium flows out',
    widget: 'physics2:actionPotential',
  },
  {
    say: 'The action potential travels along the neuron’s axon to its synapses on other neurons, where it releases neurotransmitter, passing the signal on',
    widget: 'physics2:propagate',
  },
  {
    say: 'Each action potential lets a little sodium into the cell, and a little potassium out. Over many spikes, this would wear down the concentration differences that the reversal potentials depend on',
    section: 'The sodium–potassium pump',
    widget: 'physics2:pumpNeed',
  },
  {
    say: 'The sodium–potassium pump keeps them up. It is a protein in the membrane that uses energy, from ATP, to carry ions against their concentration gradients',
    widget: 'physics2:pump',
  },
  {
    say: 'In each round it carries three sodium ions out of the cell and two potassium ions in, using the energy of one molecule of ATP',
    widget: 'physics2:pumpCycle',
  },
  {
    say: 'As three positive charges go out for every two that come in, the pump also makes the inside a little more negative, by a few millivolts',
    widget: 'physics2:electrogenic',
  },
  {
    say: 'Each spike moves only a small share of the ions, but neurons fire many spikes: running the pumps takes a large share of the brain’s energy',
    widget: 'physics2:pumpEnergy',
  },
  {
    say: 'Next, to see how inputs add up and spread, we will look at how current flows within a neuron, starting with a dendrite',
    section: 'Current in a dendrite',
    widget: 'physics2:first',
  },
  {
    say: 'Let’s say we want to consider what happens when current is injected into the system, for example by an electrode or a different type of ion channel',
    widget: 'physics2:inject',
  },
  {
    say: 'We’ll take the latter example, of an ion channel which opens in certain circumstances',
    widget: 'physics2:channel',
  },
  {
    say: 'Say it opens briefly, for about 5 milliseconds, and then shuts again',
    widget: 'physics2:opens',
  },
  {
    say: 'While it is open, sodium ions flow in through it, as it is selective for sodium',
    widget: 'physics2:sodium',
  },
  {
    say: 'The influx of positive ions neutralizes part of the excess negative layer inside the membrane, and reduces the excess positive charge outside',
    widget: 'physics2:excess',
  },
  {
    say: 'This drives the membrane potential up in the vicinity of the channel',
    widget: 'physics2:rise',
  },
  {
    say: 'The initial rise in voltage when the channel is open is therefore short',
    widget: 'physics2:brief',
  },
  {
    say: 'The rise time is governed by the resistance of the open ion channels and the capacitance of the membrane\n\nThe resistance of the open ion channels is governed by the number of channels × the open probability × the single-channel conductance. The larger that product, the lower the resistance (= 1 / conductance)',
    widget: 'physics2:resist',
  },
  {
    say: 'In fact the time constant (the time for the voltage to rise 63% of the way) is equal to that resistance × the capacitance of the membrane',
    widget: 'physics2:rc',
  },
  {
    say: 'The capacitance is how much charge the membrane holds per volt across it\n\nOr conversely, how much charge is needed to create a voltage of 1 volt',
    widget: 'physics2:capacitance',
  },
  {
    say: 'The membrane capacitance is constant at about 1 µF/cm² across most types of neuron\n\nCapacitance is governed by the thickness of the membrane. The charge either side sets the field across it, and the voltage is the work to carry a charge through that field, so across a thinner membrane the same charge makes less voltage, and more charge is needed for 1 volt',
    widget: 'physics2:thickness',
  },
  {
    say: 'Capacitance also grows with the area of the membrane, and with the dielectric constant ε of the lipids between the two layers of charge, a measure of how much they weaken the field, and so the voltage, for the same charge: C = ε × A / d\n\nEvery neuron’s membrane is much the same lipid bilayer, of much the same thickness, so per cm² its capacitance is much the same too',
    widget: 'physics2:dielectric',
  },
  {
    say: 'Ohm’s law sets the current through the open channels: I = (E − V) / R, the gap between their reversal potential E and the membrane potential V, divided by their resistance R',
    widget: 'physics2:ohm',
  },
  {
    say: 'That current charges the membrane’s capacitance. Since Q = C × V, the voltage is V = Q / C, so a charge ΔQ flowing in raises it by ΔV = ΔQ / C. A current I brings in a charge I each second, so it raises the voltage by I / C each second',
    note: 'Together, the voltage rises at (E − V) / (R × C): fast at first, then slower as V nears E, so it covers 63% of the way in τ = R × C',
    widget: 'physics2:charging',
  },
  {
    say: 'The extra positive charge also repels nearby positive ions, mainly K⁺, which is the most abundant cation inside',
    section: 'Spread and decay',
    widget: 'physics2:repel',
  },
  {
    say: 'These cations in turn repel other cations, leading to a net flow of cations along the dendrite, with these cations accumulating on the membrane to also drive the membrane potential up further down the dendrite',
    widget: 'physics2:along',
  },
  {
    say: 'This spread of charge along the dendrite contributes to a fast decay in the membrane potential in the vicinity of the channel',
    widget: 'physics2:spread',
  },
  {
    say: 'Additionally contributing to the decay, K⁺ ions leak out through the membrane with a slower time constant τₘ (about 10–30 ms)',
    widget: 'physics2:leak',
  },
  {
    say: 'That explains why the local change in potential by the channel is large and brief, while the same change recorded at the soma is smaller, rises more slowly, and decays more slowly. Once the charge has spread out, the decay mostly reflects leakage over τₘ',
    widget: 'physics2:soma',
  },
  {
    say: 'The cations also leak out through ion channels meaning that the propagation of positive charge gradually decays',
    widget: 'physics2:decay',
  },

  // {
  //   say: 'The number of potassium ions at the membrane and thus the voltage and strength of the electric field depend on the concentrations of potassium ions inside and outside the cell',
  //   note: 'As we will see, the brain controls the concentrations of ions inside and outside of cells, such that they stay constant over time.',
  //   widget: 'physics2:depends',
  // }
];
