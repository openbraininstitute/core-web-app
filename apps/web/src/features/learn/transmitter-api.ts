import type { FeedItem } from '@/features/learn/feed-item';

/*
 * The Transmitter's articles, from its WordPress API (thetransmitter.org/wp-json): the latest on
 * the server, for the page's first paint, and the whole archive searched from the browser as words
 * are typed. Its articles' own authors are kept where its API does not give them, so each is
 * credited to The Transmitter.
 */

const API = 'https://www.thetransmitter.org/wp-json/wp/v2/posts';

export type Post = {
  id: number;
  date: string;
  link: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  _embedded?: {
    'wp:featuredmedia'?: {
      source_url?: string;
      media_details?: { sizes?: Record<string, { source_url: string }> };
    }[];
    'wp:term'?: { name: string }[][];
  };
};

/** The API's address for `count` posts, newest first, matching `search` if there is one. */
export function transmitterUrl(count: number, search?: string) {
  const params = new URLSearchParams({
    per_page: String(count),
    _embed: 'wp:featuredmedia,wp:term',
    _fields: 'id,date,link,title,excerpt,_links,_embedded',
  });
  if (search) params.set('search', search);
  return `${API}?${params}`;
}

/** Tags stripped and entities decoded: WordPress renders its titles and excerpts as HTML. */
function plain(html: string) {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(Number.parseInt(n, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function fromPost(p: Post): FeedItem {
  const media = p._embedded?.['wp:featuredmedia']?.[0];
  const sizes = media?.media_details?.sizes;
  const terms = (p._embedded?.['wp:term'] ?? []).flat().map((t) => t.name);
  return {
    id: String(p.id),
    title: plain(p.title.rendered),
    byline: terms[0],
    when: new Date(p.date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    start: p.date,
    body: plain(p.excerpt.rendered),
    tags: terms.slice(1, 7),
    image: sizes?.medium_large?.source_url ?? sizes?.medium?.source_url ?? media?.source_url,
    href: p.link,
    hrefLabel: 'Read on The Transmitter',
  };
}
