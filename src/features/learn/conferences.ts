import type { FeedItem } from '@/features/learn/feed-item';

/**
 * The field's main meetings, as announced by their organisers (checked October 2026). The Learn
 * page adds World Wide Neuro's own list of upcoming conferences to these, and drops any that have
 * passed.
 */
export const CONFERENCES: FeedItem[] = [
  {
    id: 'sfn-2026',
    title: 'Neuroscience 2026 (SfN)',
    when: 'Nov 14–18, 2026',
    start: '2026-11-14',
    where: 'Washington, D.C., USA · with a virtual component',
    body: 'The Society for Neuroscience’s annual meeting, the largest gathering of neuroscientists in the world, with symposia, lectures, posters and an exhibition across the whole field.',
    tags: ['Neuroscience'],
    href: 'https://www.sfn.org/meetings/neuroscience-2026',
    hrefLabel: 'Visit the meeting’s site',
  },
  {
    id: 'cosyne-2027',
    title: 'Cosyne 2027',
    when: 'Mar 11–16, 2027',
    start: '2027-03-11',
    where: 'Montréal, Canada',
    body: 'Computational and Systems Neuroscience: experimental and theoretical approaches to systems neuroscience, with workshops after the main meeting.',
    tags: ['Computational neuroscience'],
    href: 'https://www.cosyne.org/',
    hrefLabel: 'Visit the meeting’s site',
  },
  {
    id: 'cns-2027',
    title: 'CNS*2027',
    when: 'Jul 10–14, 2027',
    start: '2027-07-10',
    where: 'Gran Canaria, Spain',
    body: 'The Organization for Computational Neurosciences’ annual meeting, with tutorials, the main meeting and workshops on modelling and analysing neural systems at every scale.',
    tags: ['Computational neuroscience'],
    href: 'https://www.cnsorg.org/future-meetings',
    hrefLabel: 'Visit the meeting’s site',
  },
  {
    id: 'bernstein-2027',
    title: 'Bernstein Conference 2027',
    when: 'Sep 15–18, 2027',
    start: '2027-09-15',
    where: 'Lausanne, Switzerland',
    body: 'The Bernstein Network’s annual conference on computational neuroscience, with satellite workshops before the main meeting.',
    tags: ['Computational neuroscience'],
    href: 'https://bernstein-network.de/bernstein-conference/',
    hrefLabel: 'Visit the meeting’s site',
  },
];
