import type { Slide } from '@/features/learn/components/walkthrough/Walkthrough';

/**
 * A first course in Python, for neuroscience: values, names, lists, loops,
 * choices, functions, dictionaries, packages and NumPy — each a cell you can
 * edit and run in the browser — ending with a neuron simulated in a dozen
 * lines, and a notebook.
 */
export const PYTHON_SLIDES: Slide[] = [
  {
    say: 'Python runs your instructions one line at a time, from the top',
    note: 'Here, print shows a value. Press Run to run it yourself: you can edit any of the code in this course.',
    widget: 'python:hello',
  },
  {
    say: 'A variable is a name for a value',
    note: 'Use = to give a name a value. Using the name later gives you its value, until you give it a new one.',
    widget: 'python:variables',
  },
  {
    say: 'Python does arithmetic',
    note: '+, −, * and / as usual; ** raises to a power; // and % give a whole division and its remainder. 100e6 means 100 × 10⁶.',
    widget: 'python:numbers',
  },
  {
    say: 'Text goes in quotes, and is called a string',
    note: 'An f-string fills values into text: whatever is in {braces} is worked out and put in its place.',
    widget: 'python:strings',
  },
  {
    say: 'A list keeps many values in order',
    note: 'Square brackets make one, and pick from it. Counting starts at 0, and −1 is the last.',
    widget: 'python:lists',
  },
  {
    say: 'A for loop does the same thing for each item',
    note: 'The indented lines run once for every item. range(1, 5) counts 1, 2, 3, 4.',
    widget: 'python:loops',
  },
  {
    say: 'if, elif and else choose what to do',
    note: 'Python checks each test in turn, and runs only the block under the first one that is true.',
    widget: 'python:conditions',
  },
  {
    say: 'A function packages steps you can reuse',
    note: 'def names it and its inputs, and return hands back its result. This one is the Nernst equation, for any ion.',
    widget: 'python:functions',
  },
  {
    say: 'A dictionary looks values up by name',
    note: "Each key leads to a value: a good way to describe a cell, a recording or a simulation's settings.",
    widget: 'python:dicts',
  },
  {
    say: 'Packages add ready-made tools',
    note: 'import brings one in. Python comes with many; others, like NumPy, are installed with pip.',
    widget: 'python:packages',
  },
  {
    say: 'NumPy does maths on whole arrays at once',
    note: 'One line works out every element, with no loop. Most scientific Python is built on it.',
    widget: 'python:numpy',
  },
  {
    say: 'Put it together: simulate a neuron',
    note: 'A leaky integrate-and-fire neuron. At each step the voltage moves towards its target; past threshold it spikes, and resets. Try changing the drive.',
    widget: 'python:simulate',
  },
  {
    say: 'Errors tell you what went wrong, and where',
    note: 'Read the last line first. Here, the code asks for item 3 of a list whose items are numbered 0, 1 and 2.',
    widget: 'python:errors',
  },
  {
    say: 'Notebooks keep code, results and notes together',
    note: 'On the Open Brain Platform you can run Python notebooks in the cloud, with its tools already installed.',
    widget: 'python:notebooks',
  },
  {
    say: 'Next, use Python to fetch real data from the platform',
    widget: 'python:notebooks',
  },
];
