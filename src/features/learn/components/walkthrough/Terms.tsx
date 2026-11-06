'use client';

/**
 * The terms a course's titles explain. The first time a slide's title uses one, it is a button
 * opening a pop-up below it: what the term means, and the simple equations it is in.
 */

import * as Popover from '@radix-ui/react-popover';
import { Fragment, useState } from 'react';

export interface SlideTerm {
  /** What its pop-up is headed. */
  name: string;
  /** The words in a title that are it — its plurals, forms and other names — matched whole, in any case. */
  forms: string[];
  /** What it is, in a sentence or two. */
  means: string;
  /** The simple equations it is in, each with what it says. Here and in `means`, `_{…}` and `^{…}` set sub- and superscripts. */
  equations: { formula: string; says: string }[];
}

/** A run of a title: one of its terms, or the words between them. */
interface Part {
  text: string;
  /** Where it starts in the title, as its key. */
  at: number;
  term?: SlideTerm;
  /** A term's neighbours up to the next space either side — a bracket, a comma, an "’s" — kept on its line. */
  before?: string;
  after?: string;
}

/**
 * `text` in runs. Only a term's first use is one, so a title saying "ions" three times has one button,
 * not three; and longer forms are tried first, so "electrical force field" is one term, not the "force
 * field" inside it.
 */
function termParts(text: string, terms: readonly SlideTerm[] = []): Part[] {
  const forms = terms
    .flatMap((term) => term.forms.map((form) => ({ form: form.toLowerCase(), term })))
    .sort((a, b) => b.form.length - a.form.length);
  const parts: Part[] = [];
  let from = 0;
  if (forms.length) {
    const any = forms.map(({ form }) =>
      form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+')
    );
    const used = new Set<SlideTerm>();
    for (const match of text.matchAll(new RegExp(`\\b(?:${any.join('|')})\\b`, 'gi'))) {
      const said = match[0].toLowerCase().replace(/\s+/g, ' ');
      const term = forms.find(({ form }) => form === said)?.term;
      if (!term || used.has(term)) continue;
      used.add(term);
      if (match.index > from) parts.push({ text: text.slice(from, match.index), at: from });
      parts.push({ text: match[0], at: match.index, term });
      from = match.index + match[0].length;
    }
  }
  if (from < text.length || !parts.length) parts.push({ text: text.slice(from), at: from });
  // (a button is one piece on its line, and a line may break either side of it, even where a bracket touches it)
  for (const [k, part] of parts.entries()) {
    const [last, next] = [parts[k - 1], parts[k + 1]];
    if (!part.term) continue;
    part.before = last && !last.term ? (/\S*$/.exec(last.text)?.[0] ?? '') : '';
    part.after = next && !next.term ? (/^\S*/.exec(next.text)?.[0] ?? '') : '';
    if (last && part.before) last.text = last.text.slice(0, -part.before.length);
    if (next && part.after) {
      next.text = next.text.slice(part.after.length);
      next.at += part.after.length;
    }
  }
  return parts.filter((part) => part.term || part.text);
}

/** A term's look, as it types and once it has: underlined in dots. */
const LOOK = 'underline decoration-sky-400/60 decoration-dotted decoration-2 underline-offset-4';

/**
 * `text`'s first `shown` characters, then the caret if `caret`, then the rest laid out invisibly. Its
 * terms look as they will once typed, each in one piece as its button will be, so that no line breaks
 * anywhere new when the typing is done.
 */
export function TypedWords({
  text,
  shown,
  caret,
  terms,
}: {
  text: string;
  shown: number;
  caret: boolean;
  terms?: readonly SlideTerm[];
}) {
  const total = Array.from(text).length;
  let at = 0;
  let placed = false;
  // a run's characters typed so far, the caret after them if they are the last typed — or at the very end — and the
  // rest laid out invisibly
  const typed = (run: string, look?: string) => {
    const chars = Array.from(run);
    const cut = Math.min(chars.length, Math.max(0, shown - at));
    const here =
      caret && !placed && shown >= at && (shown < at + chars.length || at + chars.length === total);
    placed ||= here;
    at += chars.length;
    const seen = chars.slice(0, cut).join('');
    return (
      <>
        {look ? <span className={look}>{seen}</span> : seen}
        {here && <span className="typing-caret" />}
        <span className="invisible">{chars.slice(cut).join('')}</span>
      </>
    );
  };
  return termParts(text, terms).map((part) =>
    part.term ? (
      <span key={part.at} className="whitespace-nowrap">
        {typed(part.before ?? '')}
        <span className="inline-block">{typed(part.text, LOOK)}</span>
        {typed(part.after ?? '')}
      </span>
    ) : (
      <Fragment key={part.at}>{typed(part.text)}</Fragment>
    )
  );
}

/** `text`, its terms buttons that open their pop-ups. */
export function TermText({ text, terms }: { text: string; terms?: readonly SlideTerm[] }) {
  return termParts(text, terms).map(({ text: words, at, term, before, after }) =>
    term ? (
      <span key={at} className="whitespace-nowrap">
        {before}
        <Term term={term} words={words} />
        {after}
      </span>
    ) : (
      <Fragment key={at}>{words}</Fragment>
    )
  );
}

/** `text` with `_{…}` and `^{…}` set as sub- and superscripts. */
function formatted(text: string) {
  let at = 0;
  return text
    .split(/([_^]\{[^}]*\})/)
    .filter(Boolean)
    .map((bit) => {
      const key = at;
      at += bit.length;
      if (bit.startsWith('_{')) return <sub key={key}>{bit.slice(2, -1)}</sub>;
      if (bit.startsWith('^{')) return <sup key={key}>{bit.slice(2, -1)}</sup>;
      return <Fragment key={key}>{bit}</Fragment>;
    });
}

/** A term's button, and its pop-up. */
function Term({ term, words }: { term: SlideTerm; words: string }) {
  const [open, setOpen] = useState(false);
  // the pop-up hangs off the course's root, for its theme, rather than off the title, which takes only words
  const [root, setRoot] = useState<HTMLElement | null>(null);

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setRoot(document.querySelector<HTMLElement>('[data-learn-root]'));
        setOpen(next);
      }}
    >
      {/* (spaced and rendered as the title is, which a button isn't of its own accord: as wide as its words typed) */}
      <Popover.Trigger
        className={`inline-block cursor-pointer rounded-sm text-left tracking-[inherit] transition-colors [text-rendering:inherit] hover:text-sky-300 data-[state=open]:text-sky-300 ${LOOK}`}
      >
        {words}
      </Popover.Trigger>
      <Popover.Portal container={root}>
        <Popover.Content
          side="bottom"
          sideOffset={6}
          collisionPadding={16}
          aria-label={term.name}
          className="animate-term-in z-50 max-h-(--radix-popover-content-available-height) w-[22rem] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-4 shadow-xl shadow-black/20"
        >
          <p className="pr-8 text-base font-semibold text-slate-100">{term.name}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-300">{formatted(term.means)}</p>
          <dl className="mt-3 flex flex-col gap-3 border-t border-slate-800 pt-3">
            {term.equations.map(({ formula, says }) => (
              <div key={formula}>
                <dt className="text-base font-medium text-sky-300">{formatted(formula)}</dt>
                <dd className="mt-0.5 text-xs leading-relaxed text-slate-400">{formatted(says)}</dd>
              </div>
            ))}
          </dl>
          <Popover.Close
            aria-label="Close"
            className="absolute top-3 right-3 grid h-7 w-7 place-items-center rounded-full text-slate-500 transition-colors hover:text-slate-300"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </Popover.Close>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
