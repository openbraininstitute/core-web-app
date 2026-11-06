'use client';

import Link from 'next/link';

import { TEACH_TOPICS, type TeachTopic } from '@/features/learn/teach';
import { Callout } from '@/features/learn/ui/callout';
import { listBox } from '@/features/learn/ui/category-tiles';
import { cn } from '@/utils/css-class';

/** The left-hand side: the teaching topics in the faint box, as the glossary's terms are. */
export function TeachIndex({
  selected,
  onSelect,
}: {
  selected: TeachTopic;
  onSelect: (id: string) => void;
}) {
  const lb = listBox();
  return (
    <div className={lb.box}>
      <ul className="secondary-scrollbar -mr-[6px] flex min-h-0 flex-col gap-[9px] overflow-y-auto pr-[6px]">
        {TEACH_TOPICS.map((t, i) => {
          const on = t.id === selected.id;
          return (
            <li key={t.id}>
              <button
                type="button"
                aria-pressed={on}
                data-learn="row"
                onClick={() => onSelect(t.id)}
                className={cn(
                  'flex w-full items-center gap-[14px] rounded-[12px] p-[12px] text-left transition-shadow',
                  on
                    ? 'bg-[#bae7ff] shadow-[inset_0_0_0_1.5px_#003a8c]'
                    : 'bg-white shadow-[inset_0_0_0_1px_#f0f0f0] hover:shadow-[inset_0_0_0_1px_#d9d9d9]'
                )}
              >
                {/* its colours inline: the selected-card styles recolour the row's navy text */}
                <span
                  className="flex size-[34px] shrink-0 items-center justify-center rounded-full text-[13px] font-bold shadow-[inset_0_0_0_1px_#d6e4ff]"
                  style={{ background: '#f0f5ff', color: '#002766' }}
                >
                  {i + 1}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <span className="text-[14px] leading-[19px] font-semibold text-[#002766]">
                    {t.title}
                  </span>
                  <span className="line-clamp-2 text-[12px] leading-[17px] text-[#8c8c8c]">
                    {t.short}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** The right-hand side: the chosen topic, with its steps, and a way to get in touch. */
export function TeachCard({
  topic,
  onSelect,
  className,
  callout,
}: {
  topic: TeachTopic;
  onSelect: (id: string) => void;
  className?: string;
  /** How its one line is set (Dev settings' Appearance). */
  callout?: number;
}) {
  const index = TEACH_TOPICS.findIndex((t) => t.id === topic.id);
  const next = TEACH_TOPICS[index + 1];
  const label = 'text-[11px] leading-[15px] font-bold tracking-[0.8px] text-[#8c8c8c] uppercase';
  return (
    <section className={cn(className, 'pt-0 pr-[44px] pb-[34px] pl-[40px]')}>
      <div className="flex max-w-[760px] flex-col gap-[22px]">
        <header
          data-learn="head"
          className="flex min-h-[84px] items-center justify-between gap-[20px]"
        >
          <div className="flex flex-col gap-[7px]">
            <h1 className="text-[31px] leading-[38px] font-bold text-[#002766]">{topic.title}</h1>
            <p className="text-[12.5px] leading-[17px] text-[#8c8c8c]">
              Teaching · {index + 1} of {TEACH_TOPICS.length}
            </p>
          </div>
          <Link
            href="/contact"
            className="flex h-[42px] shrink-0 items-center rounded-[22px] bg-[#389e0d] px-[26px] text-[14px] leading-[19px] font-semibold whitespace-nowrap text-white transition-colors hover:bg-[#237804]"
          >
            Contact us
          </Link>
        </header>

        <Callout design={callout}>{topic.short}</Callout>

        <div className="flex flex-col gap-[14px]">
          {topic.body.map((para) => (
            <p key={para.slice(0, 32)} className="text-[15px] leading-[25px] text-[#595959]">
              {para}
            </p>
          ))}
        </div>

        {topic.facts?.length ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-[10px]">
            {topic.facts.map((f) => (
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
        ) : null}

        {topic.steps?.length ? (
          <div className="flex flex-col gap-[10px]">
            <h2 className={label}>Steps</h2>
            <ol className="flex flex-col gap-[8px]">
              {topic.steps.map((s, i) => (
                <li
                  key={s}
                  className="flex items-center gap-[12px] rounded-[12px] border border-[#f0f0f0] bg-[#fafafa] px-[14px] py-[10px] text-[14px] leading-[20px] text-[#002766]"
                >
                  <span className="flex size-[24px] shrink-0 items-center justify-center rounded-full bg-[#002766] text-[12px] font-bold text-white">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        {next && (
          <button
            type="button"
            onClick={() => onSelect(next.id)}
            className="flex h-[38px] items-center gap-[6px] self-start rounded-full border border-[#e8e8e8] px-[16px] text-[13px] font-semibold text-[#003a8c] hover:border-[#d9d9d9] hover:bg-[#f5f9ff]"
          >
            Next: {next.title} ›
          </button>
        )}
      </div>
    </section>
  );
}
