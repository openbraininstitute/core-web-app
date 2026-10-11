import type { Slide } from '@/features/learn/components/walkthrough/Walkthrough';

/**
 * The learn app's opening walkthrough: why model the brain, and how the Open Brain Institute sets
 * out to make that possible for everyone. Its last slide asked where to start; here, the Learn
 * page's courses are where to go next.
 */
export const WHY_MODEL_SLIDES: Slide[] = [
  {
    say: 'The brain governs everything about us...',
    note: 'Our experience, actions, emotions and thoughts',
    widget: 'brain',
  },
  {
    say: 'Understanding the brain is a major scientific challenge of our time...',
    note: 'And can revolutionize medicine, technology, and our understanding of ourselves...',
  },
  {
    say: 'But the workings of the brain are complex...',
    note: 'And experiments are limited in what they can reveal',
  },
  {
    say: 'Simulatable brain models...',
    note: 'Allow questions to be studied which might be impossible to study in the laboratory',
  },
  {
    say: 'Before now, brain models were difficult to build and use...',
    note: 'Often requiring specialized knowledge and resources',
  },
  {
    say: 'The Open Brain Institute aims to accelerate Neuroscience...',
    note: 'By making brain modeling accessible, enabling international collaboration, and leveraging AI',
  },
  {
    say: 'The Open Brain Platform’s Virtual Labs are a place to LEARN, EXPLORE, and COLLABORATE.',
    note: 'Engage with cutting-edge brain research and contribute to the scientific community.',
  },
  {
    say: 'So where would you like to start?',
    note: 'Go back to Learn to choose a course: an introduction to brain modeling, the electrical physics of a neuron, Python, the platform itself, and more.',
  },
];
