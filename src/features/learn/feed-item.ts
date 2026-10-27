/** An entry in one of the Learn page's outside sections: a talk, a conference, an article or a paper. */
export type FeedItem = {
  id: string;
  title: string;
  /** Who: the speaker and their institution, the author, or the authors. */
  byline?: string;
  /** When, as the source writes it. */
  when?: string;
  /** Where: a conference's city, or a paper's journal. */
  where?: string;
  body?: string;
  tags?: string[];
  image?: string;
  /** The entry's own page at its source, and what following it does. */
  href: string;
  hrefLabel: string;
  /** For sorting conferences: an ISO start date. */
  start?: string;
};
