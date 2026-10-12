'use client';

import { useEffect, useRef, useState } from 'react';

/*
 * The category tiles at the top of the Learn page, in the current design and five candidates, for
 * judging side by side. TEMPORARY: once one is picked, keep its branch of CategoryTiles, drop the
 * rest and the switcher.
 */

import {
  ArticlesIcon,
  ConferencesIcon,
  FeaturesIcon,
  FreeCoursesIcon,
  GlossaryIcon,
  LecturesIcon,
  LiteratureIcon,
  ShowcasesIcon,
  TeachIcon,
  TutorialsIcon,
} from '@/features/learn/ui/icons';
import { cn } from '@/utils/css-class';

/** Every tile, in order: those with a section, and those still to come. */
export const CATEGORIES = [
  { key: 'free', label: 'Courses', Icon: FreeCoursesIcon },
  { key: 'glossary', label: 'Glossary', Icon: GlossaryIcon },
  { key: 'teach', label: 'Teach', Icon: TeachIcon },
  { key: 'tutorials', label: 'Tutorials', Icon: TutorialsIcon },
  { key: 'features', label: 'Features', Icon: FeaturesIcon },
  { key: 'lectures', label: 'Lectures', Icon: LecturesIcon },
  { key: 'literature', label: 'Literature', Icon: LiteratureIcon },
  { key: 'articles', label: 'Articles', Icon: ArticlesIcon },
  { key: 'conferences', label: 'Conferences & Workshops', Icon: ConferencesIcon },
  { key: 'showcases', label: 'Showcases', Icon: ShowcasesIcon },
];

export const TILE_DESIGNS = [
  'Current',
  'Gradient glow',
  'Icon badge',
  'Bento',
  'Keycap',
  'Watermark',
] as const;

type Category = (typeof CATEGORIES)[number];

/** One tile, drawn the way design `design` draws it. */
function Tile({
  design,
  category,
  active,
  soon,
}: {
  design: number;
  category: Category;
  active: boolean;
  soon: boolean;
}) {
  const { label, Icon } = category;
  const common = { title: soon ? 'Coming soon' : undefined };
  const text = 'text-[12px] leading-[14.67px] font-semibold';

  switch (design) {
    // Gradient glow: the live tile lit from its top-left corner, with a coloured shadow under it;
    // the rest sit quietly, a hair of blue in the border.
    case 1:
      return (
        <div
          {...common}
          className={cn(
            'relative flex h-[86px] flex-col items-center justify-center gap-[8px] overflow-hidden rounded-[14px] px-[5px] text-center transition-transform',
            active
              ? 'bg-linear-to-br from-[#002766] via-[#003a8c] to-[#1890ff] text-white shadow-[0_8px_20px_-6px_rgba(24,144,255,0.55),inset_0_1px_0_rgba(255,255,255,0.25)]'
              : 'border border-[#d6e4ff] bg-linear-to-b from-white to-[#f5f9ff] text-[#003a8c]/80 hover:-translate-y-px'
          )}
        >
          {active && (
            <span className="pointer-events-none absolute -top-6 -left-6 size-16 rounded-full bg-white/20 blur-xl" />
          )}
          <Icon className="relative size-5 shrink-0" />
          <span className={cn('relative', text)}>{label}</span>
        </div>
      );

    // Icon badge: each icon in a soft rounded square, the live tile navy with a white badge.
    case 2:
      return (
        <div
          {...common}
          className={cn(
            'flex h-[96px] flex-col items-center justify-center gap-[9px] rounded-[14px] border px-[5px] text-center',
            active
              ? 'border-[#002766] bg-[#002766] text-white'
              : 'border-[#e8e8e8] bg-white text-[#595959]'
          )}
        >
          <span
            className={cn(
              'flex size-[34px] items-center justify-center rounded-[10px]',
              active ? 'bg-white text-[#002766]' : 'bg-[#f0f5ff] text-[#003a8c]/70'
            )}
          >
            <Icon className="size-[18px]" />
          </span>
          <span className={text}>{label}</span>
        </div>
      );

    // Bento: icon top-left, name bottom-left, and a small "Soon" chip on what is not there yet.
    case 3:
      return (
        <div
          {...common}
          className={cn(
            'relative flex h-[92px] flex-col justify-between rounded-[16px] border p-[11px]',
            active
              ? 'border-[#002766] bg-[radial-gradient(120%_90%_at_100%_0%,#1d4f9e_0%,#002766_60%)] text-white'
              : 'border-[#e8e8e8] bg-white text-[#003a8c]'
          )}
        >
          <Icon className="size-[18px]" />
          {soon && (
            <span className="absolute top-[9px] right-[8px] rounded-full bg-[#f5f5f5] px-[6px] py-px text-[9px] leading-[13px] font-semibold tracking-[0.3px] text-[#8c8c8c] uppercase">
              Soon
            </span>
          )}
          <span className={cn(text, 'text-left')}>{label}</span>
        </div>
      );

    // Keycap: raised keys with a darker bottom edge; the live one is pressed in.
    case 4:
      return (
        <div
          {...common}
          className={cn(
            'flex h-[82px] flex-col items-center justify-center gap-[8px] rounded-[12px] border px-[5px] text-center transition-all',
            active
              ? 'mt-[3px] border-[#001d4d] bg-[#002766] text-white shadow-[0_1px_0_#001d4d,inset_0_2px_4px_rgba(0,0,0,0.35)]'
              : 'border-[#d9d9d9] bg-linear-to-b from-white to-[#fafafa] text-[#003a8c] shadow-[0_3px_0_#d9d9d9] hover:translate-y-px hover:shadow-[0_2px_0_#d9d9d9]'
          )}
        >
          <Icon className="size-[18px] shrink-0" />
          <span className={text}>{label}</span>
        </div>
      );

    // Watermark: the name top-left and the icon, huge and faint, running off the bottom-right.
    case 5:
      return (
        <div
          {...common}
          className={cn(
            'relative h-[86px] overflow-hidden rounded-[14px] border p-[10px]',
            active
              ? 'border-[#002766] bg-[#002766] text-white'
              : 'border-[#e8e8e8] bg-white text-[#003a8c]'
          )}
        >
          <span className={cn(text, 'relative block text-left')}>{label}</span>
          <Icon
            className={cn(
              'absolute -right-[10px] -bottom-[12px] size-[64px]',
              active ? 'text-[#69c0ff]/60' : 'text-[#003a8c]/[0.09]'
            )}
          />
        </div>
      );

    // Current: as designed.
    default:
      return (
        <div
          {...common}
          className={cn(
            'flex h-[86px] flex-col items-center justify-center gap-[8px] rounded-[12px] border px-[5px] text-center',
            active
              ? 'border-[#002766] bg-[#002766] text-white'
              : 'border-[#d9d9d9] bg-white text-[#003a8c]'
          )}
        >
          <Icon className="size-4 shrink-0" />
          <span className={text}>{label}</span>
        </div>
      );
  }
}

/** The sections there is something in so far; the rest are greyed out. */
export const LEARN_SECTIONS = [
  'free',
  'teach',
  'glossary',
  'tutorials',
  'lectures',
  'literature',
  'articles',
  'conferences',
] as const;
type LearnSection = (typeof LEARN_SECTIONS)[number];

export function CategoryTiles({
  design,
  section,
  onSelect,
  off = [],
  hidden = [],
}: {
  design: number;
  section: LearnSection;
  onSelect: (section: LearnSection) => void;
  /** Sections that have a page but nothing to show, e.g. courses when every course's flag is off. */
  off?: LearnSection[];
  /** Tiles left out altogether, by key: switched off in the Sections options. */
  hidden?: string[];
}) {
  return (
    <div data-learn="tiles" className="grid grid-cols-5 items-start gap-[10px]">
      {CATEGORIES.filter((c) => !hidden.includes(c.key)).map((category) => {
        const live =
          (LEARN_SECTIONS as readonly string[]).includes(category.key) &&
          !(off as string[]).includes(category.key);
        const active = live && category.key === section;
        return (
          <button
            key={category.key}
            type="button"
            disabled={!live}
            aria-pressed={active}
            onClick={() => onSelect(category.key as LearnSection)}
            // what is not there yet is greyed out, whichever design draws it
            className={cn('block text-left', !live && 'cursor-not-allowed opacity-50 grayscale')}
          >
            <Tile design={design} category={category} active={active} soon={!live} />
          </button>
        );
      })}
    </div>
  );
}

/**
 * How the selected card on the left is drawn, over whatever the look does; the first leaves it to
 * the look. learn.css styles them by the page's data-selected. TEMPORARY.
 */
export const SELECTED_STYLES = [
  'As the look',
  'Navy fill',
  'Accent bar',
  'Blue glow',
  'Lifted',
  'Gradient',
] as const;

export const SELECTED_SLUGS = ['look', 'navy', 'bar', 'glow', 'lift', 'gradient'] as const;

/** The list box's classes, and whether it is dark (no longer: the dark looks are gone). */
export function listBox() {
  const dark = false;
  return {
    dark,
    box: dark
      ? 'learn-list border-primary-9 bg-primary-9 flex min-h-0 flex-1 flex-col gap-[12px] rounded-3xl border p-[12px]'
      : 'learn-list border-primary-9/[0.06] bg-primary-9/[0.04] flex min-h-0 flex-1 flex-col gap-[12px] rounded-3xl border p-[12px]',
    title: dark
      ? 'text-[17px] leading-[23px] font-bold text-white'
      : 'text-[17px] leading-[23px] font-bold text-[#002766]',
    count: dark
      ? 'text-[12px] leading-[16px] text-white/60'
      : 'text-[12px] leading-[16px] text-[#8c8c8c]',
    /** under the box's sticky headings, the box's own colour */
    stickyBg: dark ? 'bg-primary-9 text-white/60' : 'bg-[#f0f2f4] text-[#8c8c8c]',
    chip: (on: boolean) =>
      cn(
        'shrink-0 rounded-full border px-[10px] py-[3px] text-[11px] leading-[15px] font-semibold transition-colors',
        on
          ? dark
            ? 'border-white bg-white text-[#002766]'
            : 'border-[#002766] bg-[#002766] text-white'
          : dark
            ? 'border-white/25 bg-transparent text-white/80 hover:border-white/60 hover:text-white'
            : 'border-[#e8e8e8] bg-white text-[#595959] hover:border-[#d9d9d9] hover:text-[#002766]'
      ),
  };
}

/** ‹ 2/6 · Gradient glow › - steps through `options`, wrapping round; and marks `defaultValue`. */
export function DesignSwitcher({
  what,
  options,
  value,
  defaultValue,
  onChange,
}: {
  what: string;
  options: readonly string[];
  value: number;
  defaultValue?: number;
  onChange: (value: number) => void;
}) {
  const n = options.length;
  const step = (by: number) => onChange((value + by + n) % n);
  const arrow =
    'flex size-[28px] items-center justify-center rounded-full text-[15px] text-[#002766] hover:bg-[#f0f5ff]';
  return (
    <div className="flex items-center gap-[4px] rounded-full border border-[#d9d9d9] bg-white/95 px-[4px] py-[3px] shadow-[0_4px_14px_rgba(0,39,102,0.12)] backdrop-blur">
      <button
        type="button"
        aria-label={`Previous ${what}`}
        className={arrow}
        onClick={() => step(-1)}
      >
        ‹
      </button>
      <span className="min-w-[132px] text-center text-[11px] leading-[15px] font-semibold text-[#595959]">
        <span className="text-[#8c8c8c]">{what}</span> {String.fromCharCode(65 + value)} ·{' '}
        {options[value]}
      </span>
      <button type="button" aria-label={`Next ${what}`} className={arrow} onClick={() => step(1)}>
        ›
      </button>
      {defaultValue !== undefined && <DefaultMark what={String.fromCharCode(65 + defaultValue)} />}
    </div>
  );
}

/** Beside an option: what its default is - Default on, Default off, or the default design's letter. */
function DefaultMark({ what }: { what: string }) {
  return (
    <span className="shrink-0 rounded-full bg-[#e6f4ff] px-[6px] py-[1px] text-[9.5px] leading-[13px] font-semibold whitespace-nowrap text-[#0050b3]">
      Default {what}
    </span>
  );
}

/** A labelled on/off switch, in the same pill as DesignSwitcher, with its default marked. TEMPORARY. */
export function SettingToggle({
  label,
  on,
  defaultOn,
  onChange,
}: {
  label: string;
  on: boolean;
  defaultOn?: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex items-center gap-[8px] rounded-full border border-[#d9d9d9] bg-white/95 py-[4px] pr-[6px] pl-[12px] text-[11px] leading-[15px] font-semibold text-[#595959] shadow-[0_4px_14px_rgba(0,39,102,0.12)] backdrop-blur"
    >
      {label}
      {defaultOn !== undefined && <DefaultMark what={defaultOn ? 'on' : 'off'} />}
      <span
        className={cn(
          'relative h-[18px] w-[32px] shrink-0 rounded-full transition-colors',
          on ? 'bg-[#002766]' : 'bg-[#d9d9d9]'
        )}
      >
        <span
          className={cn(
            'absolute top-[2px] left-[2px] size-[14px] rounded-full bg-white shadow transition-transform',
            on && 'translate-x-[14px]'
          )}
        />
      </span>
    </button>
  );
}

/** The gear on the Dev settings' button. */
const GEAR = (
  <svg viewBox="0 0 16 16" aria-hidden="true" className="size-[16px]">
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
      d="M6.9 1.6h2.2l.35 1.75 1.2.5 1.5-1 1.55 1.55-1 1.5.5 1.2 1.75.35v2.2l-1.75.35-.5 1.2 1 1.5-1.55 1.55-1.5-1-1.2.5-.35 1.75H6.9l-.35-1.75-1.2-.5-1.5 1-1.55-1.55 1-1.5-.5-1.2-1.75-.35V6.9l1.75-.35.5-1.2-1-1.5L3.85 2.3l1.5 1 1.2-.5.35-1.75Z"
    />
    <circle cx="8" cy="8" r="2.1" fill="none" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

/**
 * The bottom-right corner of the card: one gear, Dev settings, opening Learn's settings and —
 * TEMPORARY — the design options, in their groups: Courses in the first column, Help and Sections
 * in the second, Appearance in the third, so that all of it fits the window. Clicked again, or
 * anywhere else, or Escape, and they close.
 */
export function OptionMenus({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const away = (ev: PointerEvent) => {
      if (!root.current?.contains(ev.target as Node)) setOpen(false);
    };
    const key = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', key);
    };
  }, [open]);
  return (
    <div ref={root} className="absolute right-[12px] bottom-[12px] z-20">
      {open && (
        <div
          role="dialog"
          aria-label="Dev settings"
          className="absolute right-0 bottom-full mb-[8px] flex max-h-[calc(100dvh-90px)] w-max flex-col gap-[10px] overflow-y-auto rounded-[16px] border border-[#e8e8e8] bg-white/90 p-[12px] shadow-[0_12px_32px_rgba(0,39,102,0.18)] backdrop-blur"
        >
          <div className="flex items-baseline justify-between gap-[16px] px-[4px]">
            <span className="text-[12px] leading-[16px] font-bold tracking-[0.8px] text-[#002766] uppercase">
              Dev settings
            </span>
            <span className="text-[10.5px] leading-[14px] text-[#8c8c8c]">
              each option's default marked
            </span>
          </div>
          <div className="grid grid-flow-col grid-rows-[auto_1fr] items-start gap-x-[16px] gap-y-[14px] [&>section:first-child]:row-span-2 [&>section:last-child]:row-span-2">
            {children}
          </div>
        </div>
      )}
      <button
        type="button"
        aria-label={open ? 'Close the dev settings' : 'Dev settings'}
        aria-expanded={open}
        title="Dev settings"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex size-[32px] items-center justify-center rounded-full border bg-white/90 text-[#595959] shadow-[0_2px_8px_rgba(0,39,102,0.12)] backdrop-blur transition-colors hover:text-[#002766]',
          open ? 'border-[#002766] text-[#002766]' : 'border-[#e8e8e8]'
        )}
      >
        {GEAR}
      </button>
    </div>
  );
}

/** One group of the Dev settings: its name, then its options in a column. */
export function OptionMenu({
  title,
  children,
}: {
  title: 'Appearance' | 'Courses' | 'Help' | 'Sections';
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title} className="flex flex-col items-end gap-[4px]">
      <span className="self-start px-[4px] text-[11px] leading-[15px] font-bold tracking-[0.8px] text-[#8c8c8c] uppercase">
        {title}
      </span>
      {children}
    </section>
  );
}
