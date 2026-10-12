'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import {
  CATEGORY_COLOURS,
  GLOSSARY,
  GLOSSARY_CATEGORIES,
  type GlossaryCategory,
  type GlossaryTerm,
} from '@/features/learn/glossary';
import { platformHref } from '@/features/learn/glossary-links';
import { Callout } from '@/features/learn/ui/callout';
import { listBox } from '@/features/learn/ui/category-tiles';
import { cn } from '@/utils/css-class';

const byName = [...GLOSSARY].sort((a, b) => a.term.localeCompare(b.term));

function CategoryTag({ category, className }: { category: GlossaryCategory; className?: string }) {
  const [text, fill] = CATEGORY_COLOURS[category];
  return (
    <span
      className={cn(
        'rounded-full px-[9px] py-[2px] text-[11px] leading-[15px] font-semibold',
        className
      )}
      style={{ color: text, background: fill }}
    >
      {category}
    </span>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-[14px] shrink-0">
      <circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="m10.4 10.4 3.1 3.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * The left-hand side for the glossary, in the same faint box as the courses: a search, a filter
 * per category, and the terms A to Z under their letters.
 */
export function GlossaryIndex({
  selected,
  onSelect,
}: {
  /** Which of PAGE_LOOKS the page is in. */
  selected: GlossaryTerm;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<GlossaryCategory | null>(null);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return byName.filter(
      (t) =>
        (!category || t.category === category) &&
        (!q ||
          t.term.toLowerCase().includes(q) ||
          t.aka?.some((a) => a.toLowerCase().includes(q)) ||
          t.short.toLowerCase().includes(q))
    );
  }, [query, category]);

  const letters = useMemo(() => {
    const groups = new Map<string, GlossaryTerm[]>();
    for (const t of shown) {
      const letter = t.term[0].toUpperCase();
      groups.set(letter, [...(groups.get(letter) ?? []), t]);
    }
    return [...groups];
  }, [shown]);

  const lb = listBox();
  const chip = lb.chip;

  return (
    <div className={lb.box}>
      <label className="flex h-[38px] items-center gap-[8px] rounded-full border border-[#e8e8e8] bg-white px-[14px] text-[#8c8c8c] focus-within:border-[#1890ff] focus-within:shadow-[0_0_0_3px_rgba(24,144,255,0.12)]">
        <SearchIcon />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search terms, abbreviations, meanings"
          aria-label="Search the glossary"
          className="min-w-0 flex-1 bg-transparent text-[13px] text-[#002766] outline-none placeholder:text-[#bfbfbf]"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear the search"
            className="text-[15px] leading-none hover:text-[#002766]"
          >
            ×
          </button>
        )}
      </label>

      <div className="flex flex-wrap gap-[6px]">
        <button type="button" className={chip(!category)} onClick={() => setCategory(null)}>
          All
        </button>
        {GLOSSARY_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            className={chip(category === c)}
            aria-pressed={category === c}
            onClick={() => setCategory(category === c ? null : c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="secondary-scrollbar -mr-[6px] min-h-0 flex-1 overflow-y-auto pr-[6px]">
        {letters.length === 0 && (
          <p className="px-[4px] py-[20px] text-center text-[13px] text-[#8c8c8c]">
            Nothing matches “{query}”.
          </p>
        )}
        {letters.map(([letter, terms]) => (
          <section key={letter} className="mb-[10px]">
            <h3
              className={cn(
                lb.stickyBg,
                'sticky top-0 z-[1] px-[4px] py-[3px] text-[11px] leading-[15px] font-bold tracking-[0.8px]'
              )}
            >
              {letter}
            </h3>
            <ul className="flex flex-col gap-[4px]">
              {terms.map((t) => {
                const on = t.id === selected.id;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      data-learn="row"
                      onClick={() => onSelect(t.id)}
                      className={cn(
                        'flex w-full items-center gap-[10px] rounded-[10px] px-[12px] py-[8px] text-left transition-shadow',
                        on
                          ? 'bg-[#bae7ff] shadow-[inset_0_0_0_1.5px_#003a8c]'
                          : 'bg-white shadow-[inset_0_0_0_1px_#f0f0f0] hover:shadow-[inset_0_0_0_1px_#d9d9d9]'
                      )}
                    >
                      <span
                        className="size-[7px] shrink-0 rounded-full"
                        style={{ background: CATEGORY_COLOURS[t.category][0] }}
                        title={t.category}
                      />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-[13.5px] leading-[19px] font-semibold text-[#002766]">
                          {t.term}
                          {t.aka?.[0] && t.aka[0].length <= 6 && (
                            <span className="ml-[6px] font-normal text-[#8c8c8c]">{t.aka[0]}</span>
                          )}
                        </span>
                        <span className="truncate text-[12px] leading-[17px] text-[#8c8c8c]">
                          {t.short}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

/** The right-hand side for the glossary: one term, in full. */
export function GlossaryCard({
  term,
  onSelect,
  project,
  className,
  callout,
}: {
  term: GlossaryTerm;
  onSelect: (id: string) => void;
  /** The project's root, which the "On the platform" links lead into. */
  project: string;
  className?: string;
  /** How its one-line answer is set (Dev settings' Appearance). */
  callout?: number;
}) {
  const index = byName.findIndex((t) => t.id === term.id);
  const prev = byName[(index - 1 + byName.length) % byName.length];
  const next = byName[(index + 1) % byName.length];
  const related = (term.related ?? [])
    .map((id) => GLOSSARY.find((t) => t.id === id))
    .filter((t): t is GlossaryTerm => !!t);
  const label = 'text-[11px] leading-[15px] font-bold tracking-[0.8px] text-[#8c8c8c] uppercase';
  const step =
    'flex h-[34px] items-center gap-[6px] rounded-full border border-[#e8e8e8] px-[14px] text-[12px] font-semibold text-[#003a8c] hover:border-[#d9d9d9] hover:bg-[#f5f9ff]';

  return (
    <section className={cn(className, 'pt-0 pr-[44px] pb-[34px] pl-[40px]')}>
      <div className="flex max-w-[760px] flex-col gap-[22px]">
        {/* level with the middle of the category tiles, as a course's title is */}
        <header
          data-learn="head"
          className="flex min-h-[84px] items-center justify-between gap-[20px]"
        >
          <div className="flex flex-col gap-[7px]">
            <h1 className="text-[31px] leading-[38px] font-bold text-[#002766]">{term.term}</h1>
            <p className="flex flex-wrap items-center gap-[8px] text-[12.5px] leading-[17px] text-[#8c8c8c]">
              <CategoryTag category={term.category} />
              {term.aka?.length ? <span>also {term.aka.join(' · ')}</span> : null}
            </p>
          </div>
          <div className="flex shrink-0 gap-[6px]">
            <button
              type="button"
              className={step}
              onClick={() => onSelect(prev.id)}
              title={prev.term}
            >
              ‹ <span className="max-w-[110px] truncate">{prev.term}</span>
            </button>
            <button
              type="button"
              className={step}
              onClick={() => onSelect(next.id)}
              title={next.term}
            >
              <span className="max-w-[110px] truncate">{next.term}</span> ›
            </button>
          </div>
        </header>

        <Callout design={callout}>{term.short}</Callout>

        <div className="flex flex-col gap-[14px]">
          {term.body.map((para) => (
            <p key={para.slice(0, 32)} className="text-[15px] leading-[25px] text-[#595959]">
              {para}
            </p>
          ))}
        </div>

        {term.facts?.length ? (
          <div className="flex flex-col gap-[10px]">
            <h2 className={label}>Numbers to know</h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-[10px]">
              {term.facts.map((f) => (
                <div
                  key={f.label}
                  className="flex flex-col gap-[2px] rounded-[12px] border border-[#f0f0f0] bg-[#fafafa] px-[14px] py-[12px]"
                >
                  <span className="text-[19px] leading-[26px] font-bold text-[#002766]">
                    {f.value}
                  </span>
                  <span className="text-[12px] leading-[16px] text-[#8c8c8c]">{f.label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {term.platform?.length ? (
          <div className="flex flex-col gap-[10px]">
            <h2 className={label}>On the platform</h2>
            <ul className="flex flex-wrap gap-[8px]">
              {term.platform.map((path) => (
                <li key={path.join('/')}>
                  <Link
                    href={platformHref(path, project)}
                    className="group flex items-center gap-[6px] rounded-full border border-[#d6e4ff] bg-white px-[12px] py-[5px] text-[12.5px] leading-[17px] text-[#003a8c] transition-colors hover:border-[#003a8c] hover:bg-[#f0f5ff]"
                  >
                    {path.map((part, i) => (
                      <span key={part} className="flex items-center gap-[6px]">
                        {i > 0 && <span className="text-[#bfbfbf]">›</span>}
                        <span className={cn(i === path.length - 1 && 'font-semibold')}>{part}</span>
                      </span>
                    ))}
                    <span
                      aria-hidden="true"
                      className="text-[#8c8c8c] transition-transform group-hover:translate-x-[2px] group-hover:text-[#003a8c]"
                    >
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {related.length ? (
          <div className="flex flex-col gap-[10px]">
            <h2 className={label}>Related</h2>
            <div className="flex flex-wrap gap-[8px]">
              {related.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelect(t.id)}
                  className="flex items-center gap-[7px] rounded-full bg-white px-[12px] py-[6px] text-[13px] leading-[18px] font-semibold text-[#002766] shadow-[inset_0_0_0_1px_#e8e8e8] hover:shadow-[inset_0_0_0_1px_#003a8c]"
                >
                  <span
                    className="size-[7px] rounded-full"
                    style={{ background: CATEGORY_COLOURS[t.category][0] }}
                  />
                  {t.term}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
