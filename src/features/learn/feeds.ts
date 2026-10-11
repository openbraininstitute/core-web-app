/*
 * The Learn page's outside sources, read on the server and cached for an hour: World Wide Neuro's
 * recorded computational neuroscience talks and its upcoming conferences, and The Transmitter's
 * latest articles. Each is read from the source's own public page or feed and shown with credit
 * and a link back; if one cannot be read, its section is simply empty.
 */

import { CONFERENCES } from '@/features/learn/conferences';
import { fromPost, type Post, transmitterUrl } from '@/features/learn/transmitter-api';

import type { FeedItem } from '@/features/learn/feed-item';

const WWN = 'https://www.world-wide.org';
/** World Wide Neuro turns away requests without a browser's user agent. */
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36',
};
const HOUR = 3600;

async function text(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: HEADERS, next: { revalidate: HOUR } });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  '#39': "'",
};
/** Tags stripped, entities decoded, white space collapsed. */
function plain(html: string) {
  return html
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e: string) => {
      if (e[0] === '#') {
        const code = e[1] === 'x' ? Number.parseInt(e.slice(2), 16) : Number(e.slice(1));
        return Number.isFinite(code) ? String.fromCodePoint(code) : m;
      }
      return ENTITIES[e] ?? m;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

/** World Wide Neuro's listing cards: a title linking to its page, then paragraphs. */
function wwnCards(html: string) {
  return [...html.matchAll(/<article[^>]*data-listing-card[^>]*>([\s\S]*?)<\/article>/g)].flatMap(
    ([, card]) => {
      const head = card.match(/<h3[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
      if (!head) return [];
      const paras = [...card.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map(([, p]) => plain(p));
      return [{ href: `${WWN}${head[1]}`, title: plain(head[2]), paras }];
    }
  );
}

/** How many of World Wide Neuro's pages of recorded talks to read, 20 talks a page. */
const RECORDED_PAGES = 10;

/** A page of World Wide Neuro's computational neuroscience talks, as entries. */
async function wwnTalks(
  query: string,
  recorded: boolean,
  field = 'comp-neuro'
): Promise<FeedItem[]> {
  const html = await text(`${WWN}/${field}/seminars?${query}`);
  if (!html) return [];
  // the listing leaves out the year: newest first for recordings, so going down the list a later
  // day of the year than the one before means a year further back
  let year = new Date().getUTCFullYear();
  let last = Number.POSITIVE_INFINITY;
  return wwnCards(html).map(({ href, title, paras }) => {
    const [byline = '', when = '', ...rest] = paras;
    const body = rest.join(' ');
    // the series and the length, which World Wide Neuro puts at the end of the abstract
    const series = body.match(/Presented in the (.+?) on \d{4}-\d{2}-\d{2}\./)?.[1];
    const length = body.match(/Recording duration: (\d{2}:\d{2}:\d{2})/)?.[1];
    let start = talkDate(body, when, recorded ? undefined : 'next');
    if (recorded && start && !/ on \d{4}-/.test(body)) {
      const day = Number(start.slice(5, 7)) * 40 + Number(start.slice(8, 10));
      if (day > last) year -= 1;
      last = day;
      start = `${year}${start.slice(4)}`;
    } else if (recorded && start) {
      year = Number(start.slice(0, 4));
      last = Number(start.slice(5, 7)) * 40 + Number(start.slice(8, 10));
    }
    return {
      id: href.split('/').pop() ?? href,
      title,
      byline: byline.replace(/\s*·\s*/, ' · '),
      // with its year, which the listing leaves out
      when: start
        ? `${new Date(start).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}${when.includes('·') ? ` ·${when.split('·').slice(1).join('·')}` : ''}`
        : when,
      start,
      body: body
        .replace(/\s*Presented in the .+? on \d{4}-\d{2}-\d{2}\.\s*/, ' ')
        .replace(/\s*Recording duration: \S+\.?/, '')
        .trim(),
      tags: [
        recorded ? 'Recorded' : 'Upcoming',
        series,
        length && `${length.replace(/^00:/, '')} recording`,
      ].filter((t): t is string => !!t),
      href,
      hrefLabel: recorded ? 'Watch on World Wide Neuro' : 'See it on World Wide Neuro',
    };
  });
}

/**
 * A talk's date, as an ISO day: a recording's from the "on 2026-05-27" World Wide Neuro puts in
 * its abstract; otherwise from its listing's "Mon, Oct 12", in the year that puts it next.
 */
function talkDate(body: string, when: string, next?: 'next') {
  const iso = body.match(/ on (\d{4}-\d{2}-\d{2})\./)?.[1];
  if (iso) return iso;
  const m = when.match(/([A-Z][a-z]{2}) (\d{1,2})/);
  if (!m) return undefined;
  const now = new Date();
  let t = new Date(`${m[1]} ${m[2]} ${now.getUTCFullYear()} UTC`);
  // still to come: a date months behind today is next year's
  if (next && t.getTime() < now.getTime() - 60 * 24 * 3600 * 1000)
    t = new Date(`${m[1]} ${m[2]} ${now.getUTCFullYear() + 1} UTC`);
  return Number.isNaN(t.getTime()) ? undefined : t.toISOString().slice(0, 10);
}

/** By date: newest first, or soonest first. */
const byDate = (items: FeedItem[], newest: boolean) =>
  [...items].sort((a, b) => {
    const d = (a.start ?? '').localeCompare(b.start ?? '');
    return newest ? -d : d;
  });

/** Unique by id, in the order first seen. */
const unique = (items: FeedItem[]) => {
  const seen = new Set<string>();
  return items.filter((x) => !seen.has(x.id) && seen.add(x.id));
};

/** Recorded talks in computational neuroscience, newest first: several pages of them. */
export async function wwnRecordings(): Promise<FeedItem[]> {
  const pages = await Promise.all(
    Array.from({ length: RECORDED_PAGES }, (_, i) =>
      wwnTalks(`timing=past&hasVideo=true${i ? `&page=${i + 1}` : ''}`, true)
    )
  );
  return byDate(unique(pages.flat()), true);
}

/**
 * Talks still to come, soonest first: computational neuroscience's, and neuroscience's as a whole,
 * since World Wide Neuro often has few of the first. Only those from today on.
 */
export async function wwnUpcoming(): Promise<FeedItem[]> {
  const [comp, all] = await Promise.all([
    wwnTalks('timing=upcoming', false),
    wwnTalks('timing=upcoming', false, 'neuro'),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  return byDate(
    unique([...comp, ...all]).filter((t) => (t.start ?? '') >= today),
    false
  );
}

/** The fields whose conferences and workshops are listed, nearest to computational neuroscience first. */
const MEETING_FIELDS = [
  ['comp-neuro', 'Computational neuroscience'],
  ['math-models', 'Mathematical modelling'],
  ['ephys', 'Electrophysiology'],
  ['cognition', 'Cognition'],
  ['neuro', 'Neuroscience'],
] as const;

/** One of World Wide Neuro's listings of meetings, read again once if it comes back empty, as it
 * sometimes does when asked for several at once. */
async function wwnMeetings(field: string, kind: 'conferences' | 'workshops') {
  for (let attempt = 0; attempt < 2; attempt++) {
    const html = await text(`${WWN}/${field}/${kind}${attempt ? '?retry=1' : ''}`);
    const cards = html ? wwnCards(html) : [];
    if (cards.length) return cards;
  }
  return [];
}

/** The conferences and workshops coming up: World Wide Neuro's, field by field, and the field's
 * main meetings, by date. */
export async function conferences(): Promise<FeedItem[]> {
  const lists = await Promise.all(
    MEETING_FIELDS.flatMap(([field, label]) =>
      (['conferences', 'workshops'] as const).map(async (kind) =>
        (await wwnMeetings(field, kind)).map(({ href, title, paras }): FeedItem => {
          const [what = '', when = '', body = ''] = paras;
          // "Conference · Machine LearningNeurIPS 2026Sydney, Atlanta and Paris · Hybrid"
          const where = what.split(title).pop()?.trim();
          return {
            id: href.split('/').pop() ?? href,
            title,
            when,
            where,
            body,
            href,
            hrefLabel: 'See it on World Wide Neuro',
            tags: [kind === 'workshops' ? 'Workshop' : 'Conference', label],
          };
        })
      )
    )
  );
  const live = unique(lists.flat());
  // the same meeting under two names ("CNS*2027" and "CNS*2027: Annual Computational ...") once
  const key = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, '');
  const same = (a: string, b: string) => key(a).startsWith(key(b)) || key(b).startsWith(key(a));
  const all = [...live, ...CONFERENCES.filter((c) => !live.some((l) => same(l.title, c.title)))];
  // those still to come, or begun within the last week
  const since = Date.now() - 7 * 24 * HOUR * 1000;
  return all.filter((c) => startOf(c) >= since).sort((a, b) => startOf(a) - startOf(b));
}

/** When a conference starts, for sorting: its ISO date, or the first date in its "when". */
function startOf(c: FeedItem) {
  const t = Date.parse(c.start ?? '');
  if (Number.isFinite(t)) return t;
  const m = c.when?.match(/([A-Z][a-z]{2}) (\d{1,2})[^,]*?,? (\d{4})/);
  return m ? Date.parse(`${m[1]} ${m[2]} ${m[3]}`) : Number.POSITIVE_INFINITY;
}

/** The Transmitter's latest 100 articles, from its API. */
export async function transmitterArticles(): Promise<FeedItem[]> {
  try {
    const res = await fetch(transmitterUrl(100), { headers: HEADERS, next: { revalidate: HOUR } });
    if (!res.ok) return [];
    return ((await res.json()) as Post[]).map(fromPost);
  } catch {
    return [];
  }
}
