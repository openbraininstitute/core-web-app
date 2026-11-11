'use client';

import { useState } from 'react';

import { listBox } from '@/features/learn/ui/category-tiles';
import { cn } from '@/utils/css-class';

import type { WfBlock, WfConfig, WfParam, Workflows } from '@/features/learn/workflows';

/** The left-hand side: the workflows' ScanConfigs, searchable by name, block or parameter. */
export function WorkflowsIndex({
  workflows,
  pending = false,
  selected,
  onSelect,
}: {
  workflows: Workflows;
  /** obi-one's schema still on its way. */
  pending?: boolean;
  selected?: WfConfig;
  onSelect: (id: string) => void;
}) {
  const lb = listBox();
  const [words, setWords] = useState('');
  const q = words.trim().toLowerCase();
  const text = (c: WfConfig) =>
    [
      c.title,
      c.id,
      c.description,
      ...c.sections.flatMap((s) => [
        s.title,
        ...s.blocks.flatMap((b) => [
          workflows.blocks[b]?.title,
          ...(workflows.blocks[b]?.params.map((p) => p.title) ?? []),
        ]),
      ]),
    ]
      .join(' ')
      .toLowerCase();
  const shown = workflows.configs.filter((c) => !q || text(c).includes(q));
  return (
    <div className={lb.box}>
      <input
        type="search"
        value={words}
        onChange={(e) => setWords(e.target.value)}
        placeholder="Search workflows, blocks and parameters"
        aria-label="Search the workflows"
        className="h-[40px] shrink-0 rounded-full border border-[#e8e8e8] bg-white px-[16px] text-[13px] text-[#002766] outline-none placeholder:text-[#bfbfbf] focus:border-[#003a8c]"
      />
      {shown.length === 0 ? (
        <p className="px-[4px] py-[20px] text-center text-[13px] text-[#8c8c8c]">
          {workflows.configs.length
            ? 'No workflows match.'
            : pending
              ? 'Loading…'
              : 'obi-one could not be reached.'}
        </p>
      ) : (
        <ul className="secondary-scrollbar -mr-[6px] flex min-h-0 flex-col gap-[9px] overflow-y-auto pr-[6px]">
          {shown.map((c) => {
            const on = c.id === selected?.id;
            const dictionaries = c.sections.filter((s) => s.kind === 'block_dictionary').length;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  data-learn="row"
                  onClick={() => onSelect(c.id)}
                  className={cn(
                    'flex w-full flex-col gap-[3px] rounded-[12px] p-[11px] text-left transition-shadow',
                    on
                      ? 'bg-[#bae7ff] shadow-[inset_0_0_0_1.5px_#003a8c]'
                      : 'bg-white shadow-[inset_0_0_0_1px_#f0f0f0] hover:shadow-[inset_0_0_0_1px_#d9d9d9]'
                  )}
                >
                  <span className="text-[14px] leading-[19px] font-semibold text-[#002766]">
                    {c.title}
                  </span>
                  <span className="text-[11px] leading-[15px] text-[#8c8c8c]">
                    {c.sections.length} fields · {dictionaries} block dictionaries
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Param({ p, blocks, depth }: { p: WfParam; blocks: Workflows['blocks']; depth: number }) {
  return (
    <div className="grid gap-1 px-3 py-2.5 sm:grid-cols-12 sm:gap-4">
      <div className="sm:col-span-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[13px] font-semibold text-[#002766]">{p.title}</span>
          {p.required ? (
            <span className="rounded bg-[#f0f5ff] px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-[#003a8c] uppercase">
              required
            </span>
          ) : null}
        </div>
        <code className="font-mono text-[11px] text-[#8c8c8c]">{p.name}</code>
      </div>
      <div className="sm:col-span-8">
        <span className="font-mono text-[12px] text-[#595959]">{p.typeLabel}</span>
        {p.units ? <span className="ml-2 text-[11px] text-[#8c8c8c]">{p.units}</span> : null}
        {p.min !== undefined || p.max !== undefined ? (
          <span className="ml-2 text-[11px] text-[#8c8c8c]">
            {p.min !== undefined ? `≥ ${p.min}` : ''}
            {p.min !== undefined && p.max !== undefined ? ', ' : ''}
            {p.max !== undefined ? `≤ ${p.max}` : ''}
          </span>
        ) : null}
        {p.defaultValue ? (
          <span className="ml-2 text-[11px] text-[#8c8c8c]">
            default <code className="font-mono">{p.defaultValue}</code>
          </span>
        ) : null}
        {p.description ? (
          <p className="mt-0.5 text-[13px] leading-[19px] text-[#595959]">{p.description}</p>
        ) : null}
        {p.options?.length ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {p.options.slice(0, 24).map((o) => (
              <code
                key={o}
                className="rounded border border-[#f0f0f0] bg-[#fafafa] px-1 py-0.5 font-mono text-[10.5px] text-[#595959]"
              >
                {o}
              </code>
            ))}
            {p.options.length > 24 ? (
              <span className="text-[11px] text-[#8c8c8c]">+{p.options.length - 24} more</span>
            ) : null}
          </div>
        ) : null}
        {/* blocks within blocks, three deep at most: some refer back to their own kind */}
        {p.blocks?.length && depth < 3 ? (
          <div className="mt-1.5 flex flex-col gap-1.5">
            {p.blocks.map((b) =>
              blocks[b] ? (
                <Block key={b} block={blocks[b]} blocks={blocks} depth={depth + 1} />
              ) : null
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** A kind of block: folded, its name and what it is; opened, its parameters. */
function Block({
  block,
  blocks,
  depth = 0,
}: {
  block: WfBlock;
  blocks: Workflows['blocks'];
  depth?: number;
}) {
  const nested = depth > 0;
  return (
    <details
      className={cn(
        'group rounded-[10px] border border-[#f0f0f0] bg-white',
        nested && 'bg-[#fafafa]'
      )}
    >
      <summary className="flex cursor-pointer list-none items-start gap-2 px-3 py-2.5">
        <span className="mt-[1px] text-[#8c8c8c] transition group-open:rotate-90">›</span>
        <span className="flex min-w-0 flex-col">
          <span className="text-[13.5px] font-semibold text-[#002766]">
            {block.title}{' '}
            <span className="font-normal text-[#8c8c8c]">· {block.params.length} parameters</span>
          </span>
          {block.description ? (
            <span className="line-clamp-2 text-[12.5px] leading-[18px] text-[#595959] group-open:line-clamp-none">
              {block.description}
            </span>
          ) : null}
        </span>
      </summary>
      {block.params.length ? (
        <div className="divide-y divide-[#f0f0f0] border-t border-[#f0f0f0]">
          {block.params.map((p) => (
            <Param key={p.name} p={p} blocks={blocks} depth={depth} />
          ))}
        </div>
      ) : (
        <p className="border-t border-[#f0f0f0] px-3 py-2 text-[12.5px] text-[#8c8c8c]">
          No parameters.
        </p>
      )}
    </details>
  );
}

const KIND: Record<string, string> = {
  block_single: 'One block',
  block_dictionary: 'Block dictionary: any number, each named, of these kinds',
  block_union: 'One block, of one of these kinds',
};

/** The right-hand side: a ScanConfig, group by group, each field's blocks to open. */
export function WorkflowCard({
  config,
  workflows,
  pending = false,
  className,
}: {
  config?: WfConfig;
  workflows: Workflows;
  /** obi-one's schema still on its way. */
  pending?: boolean;
  className?: string;
}) {
  if (!config)
    return (
      <section
        className={cn(
          className,
          'flex items-center justify-center p-10 text-[15px] text-[#8c8c8c]'
        )}
      >
        {pending ? 'Loading…' : 'No workflows to show.'}
      </section>
    );
  const groups = [
    ...config.groups,
    ...new Set(
      config.sections.map((s) => s.group ?? 'Other').filter((g) => !config.groups.includes(g))
    ),
  ];
  return (
    <section className={cn(className, 'pt-[28px] pr-[44px] pb-[34px] pl-[40px]')}>
      <div className="flex max-w-[860px] flex-col gap-[18px]">
        <header className="flex flex-col gap-[7px]">
          <h1 className="text-[28px] leading-[35px] font-bold text-[#002766]">{config.title}</h1>
          <p className="flex flex-wrap items-center gap-2 text-[12.5px] text-[#8c8c8c]">
            <code className="rounded border border-[#f0f0f0] bg-[#fafafa] px-1.5 py-0.5 font-mono">
              {config.id}
            </code>
            obi-one{workflows.version ? ` v${workflows.version}` : ''} · live schema
          </p>
        </header>
        {config.description ? (
          <p className="text-[15px] leading-[25px] whitespace-pre-line text-[#595959]">
            {config.description}
          </p>
        ) : null}
        {groups.map((g) => {
          const sections = config.sections.filter((s) => (s.group ?? 'Other') === g);
          if (!sections.length) return null;
          return (
            <section key={g} className="flex flex-col gap-[10px]">
              <h2 className="text-[11px] leading-[15px] font-bold tracking-[0.8px] text-[#8c8c8c] uppercase">
                {g}
              </h2>
              {sections.map((s) => (
                <div
                  key={s.key}
                  className="rounded-[14px] border border-[#e8e8e8] bg-white p-[14px]"
                >
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className="text-[16px] font-semibold text-[#002766]">{s.title}</h3>
                    <code className="font-mono text-[11px] text-[#8c8c8c]">{s.key}</code>
                    <span className="rounded-full bg-[#f0f5ff] px-2 py-0.5 text-[11px] font-semibold text-[#003a8c]">
                      {KIND[s.kind] ?? s.kind}
                      {s.blocks.length > 1 ? ` · ${s.blocks.length}` : ''}
                    </span>
                  </div>
                  {s.description ? (
                    <p className="mt-1 text-[13px] leading-[19px] text-[#595959]">
                      {s.description}
                    </p>
                  ) : null}
                  {s.blocks.length ? (
                    <div className="mt-2.5 flex flex-col gap-1.5">
                      {s.blocks.map((b) =>
                        workflows.blocks[b] ? (
                          <Block key={b} block={workflows.blocks[b]} blocks={workflows.blocks} />
                        ) : null
                      )}
                    </div>
                  ) : null}
                </div>
              ))}
            </section>
          );
        })}
      </div>
    </section>
  );
}
