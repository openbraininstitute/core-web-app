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
    say: 'The cell membrane separates the inside of the neuron from the outside "extracellular" space',
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
    say: 'Reminder: like charges repel and opposite charges attract',
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
    say: "Let's think about the potassium ions",
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
    say: "If the potassium ions weren't charged, this would lead to the concentrations of potassium ions equaling out over time",
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
    say: 'The negative ion has an electrical force field attracting positive ions',
    widget: 'physics2:fieldN',
  },
  {
    say: 'Together these create a force field across the membrane, repelling positive charge',
    widget: 'physics2:across',
  },
  {
    say: 'With lots of these pairs close to the membrane, an electric field is created across it, including inside the ion channel',
    widget: 'physics2:sheet',
  },
  {
    say: 'This field pushes potassium ions back into the cell, making it harder for them to pass out through the channel',
    widget: 'physics2:pushed',
  },
  {
    say: 'And easier for potassium ions to enter the cell',
    widget: 'physics2:enter',
  },
  {
    say: 'These two processes: diffusion leading to the outflow of potassium ions, and the electric force field repelling potassium ions from leaving and attracting them to enter the cell, balance each other out',
    widget: 'physics2:balance',
  },
  {
    say: 'This electric force field can be measured in terms of the voltage it creates between two points',
    widget: 'physics2:voltage',
  },
  {
    say: 'A voltage is defined as the work done (energy measured in joules) needed to move a charge from one point to another',
    widget: 'physics2:work',
  },
  {
    say: 'The number of potassium ions at the membrane and thus the voltage and strength of the electric field depend on the concentrations of potassium ions inside and outside the cell',
    note: 'As we will see, the brain controls the concentrations of ions inside and outside of cells, such that they stay constant over time.',
    widget: 'physics2:depends',
  },
];
