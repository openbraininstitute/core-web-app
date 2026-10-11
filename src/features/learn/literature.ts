'use client';

import { useEffect, useState } from 'react';

import type { FeedItem } from '@/features/learn/feed-item';

/*
 * The Literature section: papers from Europe PMC, or OpenAlex (openalex.org) if it cannot be
 * reached, searched from the browser. A topic narrows the search to computational neuroscience's
 * own corners, within neuroscience; the words typed narrow it further; and the papers come most cited first, or newest.
 */

export const LITERATURE_TOPICS = [
  { id: 'all', label: 'All', query: 'computational model' },
  {
    id: 'detailed',
    label: 'Detailed models',
    query: 'biophysically detailed neuron model simulation',
  },
  { id: 'circuits', label: 'Cortical circuits', query: 'cortical microcircuit model' },
  { id: 'dendrites', label: 'Dendrites', query: 'dendritic computation' },
  { id: 'plasticity', label: 'Plasticity', query: 'synaptic plasticity model' },
  { id: 'channels', label: 'Ion channels', query: 'ion channel model neuron' },
  { id: 'connectomics', label: 'Connectomics', query: 'connectome electron microscopy' },
  { id: 'dynamics', label: 'Network dynamics', query: 'neural network dynamics spiking' },
  { id: 'ml', label: 'Machine learning', query: 'deep learning neuroscience' },
] as const;
export type LiteratureTopic = (typeof LITERATURE_TOPICS)[number]['id'];

export const LITERATURE_SORTS = [
  { id: 'cited', label: 'Most cited', param: 'cited_by_count:desc' },
  { id: 'recent', label: 'Newest', param: 'publication_date:desc' },
] as const;
export type LiteratureSort = (typeof LITERATURE_SORTS)[number]['id'];

type Work = {
  id: string;
  display_name: string | null;
  publication_year: number | null;
  cited_by_count: number;
  doi: string | null;
  abstract_inverted_index: Record<string, number[]> | null;
  authorships: { author: { display_name: string } }[];
  primary_location: {
    source: { display_name: string } | null;
    landing_page_url: string | null;
  } | null;
  open_access: { is_oa: boolean; oa_url: string | null } | null;
  primary_topic: { display_name: string } | null;
};

/** OpenAlex keeps abstracts as each word's positions; this puts the words back in order. */
function abstractOf(index: Work['abstract_inverted_index']) {
  if (!index) return undefined;
  const words: string[] = [];
  for (const [word, at] of Object.entries(index)) for (const i of at) words[i] = word;
  return words.join(' ');
}

function authorsOf(work: Work) {
  const names = work.authorships.map((a) => a.author.display_name);
  return names.length > 3 ? `${names.slice(0, 3).join(', ')} et al.` : names.join(', ');
}

function toItem(work: Work): FeedItem {
  const link = work.doi ?? work.primary_location?.landing_page_url ?? work.id;
  return {
    id: work.id.split('/').pop() ?? work.id,
    title: work.display_name ?? 'Untitled',
    byline: authorsOf(work),
    when: work.publication_year ? String(work.publication_year) : undefined,
    where: work.primary_location?.source?.display_name,
    body: abstractOf(work.abstract_inverted_index),
    tags: [
      `${work.cited_by_count.toLocaleString('en-GB')} citations`,
      work.primary_topic?.display_name,
      work.open_access?.is_oa ? 'Open access' : undefined,
    ].filter((t): t is string => !!t),
    href: work.open_access?.oa_url ?? link,
    hrefLabel: work.open_access?.oa_url ? 'Read the paper (open access)' : 'Go to the paper',
  };
}

/** A paper as Europe PMC returns it (resultType=core). */
type EpmcPaper = {
  id: string;
  source: string;
  title?: string;
  authorString?: string;
  pubYear?: string;
  journalInfo?: { journal?: { title?: string } };
  abstractText?: string;
  citedByCount?: number;
  doi?: string;
  isOpenAccess?: 'Y' | 'N';
  pmcid?: string;
};

function fromEpmc(p: EpmcPaper): FeedItem {
  const names = (p.authorString ?? '').replace(/\.$/, '').split(', ');
  const open = p.isOpenAccess === 'Y' && p.pmcid;
  return {
    id: `${p.source}-${p.id}`,
    title: (p.title ?? 'Untitled').replace(/\.$/, ''),
    byline: names.length > 3 ? `${names.slice(0, 3).join(', ')} et al.` : names.join(', '),
    when: p.pubYear,
    where: p.journalInfo?.journal?.title,
    body: p.abstractText?.replace(/<[^>]+>/g, ''),
    tags: [
      `${(p.citedByCount ?? 0).toLocaleString('en-GB')} citations`,
      open ? 'Open access' : undefined,
    ].filter((t): t is string => !!t),
    href: open
      ? `https://europepmc.org/article/PMC/${p.pmcid}`
      : p.doi
        ? `https://doi.org/${p.doi}`
        : `https://europepmc.org/article/${p.source}/${p.id}`,
    hrefLabel: open ? 'Read the paper (open access)' : 'Go to the paper',
  };
}

/** The words, for OpenAlex: no comma, colon or bar, which would end its filter. */
const cleanWords = (q: string) => q.replace(/[,|:()"]/g, ' ').trim();

async function fromOpenAlex(query: string, sort: LiteratureSort, signal: AbortSignal) {
  const filter = [
    // neuroscience's papers only (OpenAlex's field 28), searched in their titles and abstracts
    'primary_topic.field.id:28',
    'type:article',
    `title_and_abstract.search:${query}`,
    // newest first: only what has been published already
    sort === 'recent' && `to_publication_date:${new Date().toISOString().slice(0, 10)}`,
  ].filter(Boolean);
  const params = new URLSearchParams({
    filter: filter.join(','),
    sort: LITERATURE_SORTS.find((s) => s.id === sort)?.param ?? 'cited_by_count:desc',
    'per-page': '30',
    select:
      'id,display_name,publication_year,cited_by_count,doi,abstract_inverted_index,authorships,primary_location,open_access,primary_topic',
  });
  const r = await fetch(`https://api.openalex.org/works?${params}`, { signal });
  if (!r.ok) throw new Error(`OpenAlex ${r.status}`);
  const data: { results: Work[] } = await r.json();
  return data.results.map(toItem);
}

/**
 * Europe PMC (europepmc.org): the topic's words in titles or abstracts, what was typed there or
 * among the authors, among papers whose abstracts are about the nervous system. The first source
 * tried: it matches authors, and OpenAlex pauses anonymous searches when it is busy.
 */
async function fromEuropePmc(
  topicWords: string,
  typed: string,
  sort: LiteratureSort,
  signal: AbortSignal
) {
  const split = (q: string) => q.split(/\s+/).filter(Boolean);
  const q = [
    // the topic's words, in the title or abstract
    ...split(topicWords).map((w) => `(TITLE:${w} OR ABSTRACT:${w})`),
    // what was typed, there or among the authors: a surname finds its author's papers
    ...split(typed).map((w) => `(TITLE:${w} OR ABSTRACT:${w} OR AUTH:${w})`),
    'ABSTRACT:(neuron OR neuronal OR neural OR brain OR cortex OR synapse)',
  ].join(' AND ');
  const params = new URLSearchParams({
    query: q,
    format: 'json',
    resultType: 'core',
    pageSize: '30',
    sort: sort === 'recent' ? 'P_PDATE_D desc' : 'CITED desc',
  });
  const r = await fetch(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?${params}`, {
    signal,
  });
  if (!r.ok) throw new Error(`Europe PMC ${r.status}`);
  const data: { resultList: { result: EpmcPaper[] } } = await r.json();
  return data.resultList.result.map(fromEpmc);
}

export type LiteratureSource = 'openalex' | 'europepmc';

/** The papers for a topic, words and order; fetched again whenever one changes. */
export function useLiterature(topic: LiteratureTopic, words: string, sort: LiteratureSort) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [state, setState] = useState<'loading' | 'done' | 'failed'>('loading');
  const [source, setSource] = useState<LiteratureSource>('europepmc');
  useEffect(() => {
    const typed = cleanWords(words);
    // with words typed, All means all of neuroscience, not only its computational models
    const base =
      topic === 'all' && typed
        ? ''
        : cleanWords(LITERATURE_TOPICS.find((t) => t.id === topic)?.query ?? '');
    const query = [base, typed].filter(Boolean).join(' ');
    const ctrl = new AbortController();
    // a little after the last key press, rather than on every one
    const timer = window.setTimeout(async () => {
      setState('loading');
      try {
        try {
          setItems(await fromEuropePmc(base, typed, sort, ctrl.signal));
          setSource('europepmc');
        } catch (e) {
          if ((e as Error).name === 'AbortError') throw e;
          setItems(await fromOpenAlex(query, sort, ctrl.signal));
          setSource('openalex');
        }
        setState('done');
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setState('failed');
      }
    }, 350);
    return () => {
      window.clearTimeout(timer);
      ctrl.abort();
    };
  }, [topic, words, sort]);
  return { items, state, source };
}
