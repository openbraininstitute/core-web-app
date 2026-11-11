'use client';

import { cn } from '@/utils/css-class';

import type { StdProperty } from '../types';

function EnumValues({ values }: { values: (string | number)[] }) {
  const pills = (vals: (string | number)[]) => (
    <span className="flex flex-wrap gap-1">
      {vals.map((v) => (
        <code
          key={String(v)}
          className="border-neutral-2 bg-neutral-1 rounded border px-1 py-0.5 font-mono text-[0.7rem] text-neutral-5"
        >
          {String(v)}
        </code>
      ))}
    </span>
  );

  if (values.length <= 6) return <div className="mt-1.5">{pills(values)}</div>;

  return (
    <details className="group mt-1.5">
      <summary className="cursor-pointer list-none text-xs text-primary-7 hover:underline">
        {values.length} allowed values
      </summary>
      <div className="mt-1.5">{pills(values)}</div>
    </details>
  );
}

type Props = {
  properties: StdProperty[];
  onSelectEntity?: (slug: string) => void;
};

export function PropertyList({ properties, onSelectEntity }: Props) {
  if (properties.length === 0) {
    return <p className="text-sm text-neutral-4">No properties to display.</p>;
  }

  return (
    <div className="border-neutral-2 divide-neutral-2 divide-y overflow-hidden rounded-xl border bg-white">
      {properties.map((p) => (
        <div key={p.name} className="grid gap-1.5 p-3 sm:grid-cols-12 sm:gap-4">
          <div className="sm:col-span-4">
            <div className="flex flex-wrap items-center gap-2">
              <code className="font-mono text-sm font-medium text-neutral-7">{p.name}</code>
              {p.required ? (
                <span className="rounded bg-primary-0 px-1.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-primary-7">
                  required
                </span>
              ) : null}
            </div>
            {p.nullable ? (
              <span className="mt-0.5 inline-block text-[0.7rem] text-label">nullable</span>
            ) : null}
            {p.inheritedFrom ? (
              <span
                className="mt-1 flex w-fit items-center gap-1 rounded border border-dashed border-neutral-3 px-1.5 py-0.5 text-[0.68rem] text-neutral-5"
                title={`Inherited from ${p.inheritedFrom}`}
              >
                ↳ from <code className="font-mono">{p.inheritedFrom}</code>
              </span>
            ) : null}
          </div>
          <div className="sm:col-span-8">
            <span className="inline-flex flex-wrap items-center gap-1.5 text-sm">
              {p.refSlug && onSelectEntity ? (
                <button
                  type="button"
                  onClick={() => onSelectEntity(p.refSlug as string)}
                  className="font-mono text-primary-7 hover:underline"
                >
                  {p.typeLabel}
                </button>
              ) : (
                <span className="font-mono text-neutral-6">{p.typeLabel}</span>
              )}
              {p.format ? (
                <span className="bg-neutral-1 rounded px-1 py-0.5 font-mono text-[0.7rem] text-label">
                  {p.format}
                </span>
              ) : null}
            </span>
            {p.description ? (
              <p className={cn('mt-1 text-sm leading-relaxed text-neutral-5')}>{p.description}</p>
            ) : null}
            {p.enumValues ? <EnumValues values={p.enumValues} /> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
