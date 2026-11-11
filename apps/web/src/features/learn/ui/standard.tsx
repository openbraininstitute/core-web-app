'use client';

import { useState } from 'react';

import { listBox } from '@/features/learn/ui/category-tiles';
import {
  categoryColor,
  getStdEntity,
  StandardEntityDetail,
  stdEntities,
  stdEntitiesByCategory,
} from '@/features/obi-standard';
import { cn } from '@/utils/css-class';

/** The entity type the address names, or the first. */
const chosen = (slug: string | null) => (slug ? getStdEntity(slug) : undefined) ?? stdEntities[0];

/**
 * The Standard section: the OBI Standard's entity types, as entitycore and entitysdk define them,
 * listed by category on the left, searchable; the chosen one's properties, files, entitysdk
 * snippets and endpoints on the right.
 */
export function StandardIndex({
  slug,
  onSelect,
}: {
  slug: string | null;
  onSelect: (slug: string) => void;
}) {
  const selected = chosen(slug);
  const lb = listBox();
  const [words, setWords] = useState('');
  const q = words.trim().toLowerCase();
  const groups = stdEntitiesByCategory()
    .map(({ category, items }) => ({
      category,
      items: items.filter(
        (e) =>
          !q ||
          `${e.title} ${e.short} ${e.entityType} ${e.properties.map((p) => p.name).join(' ')}`
            .toLowerCase()
            .includes(q)
      ),
    }))
    .filter((g) => g.items.length);
  return (
    <div className={lb.box}>
      <input
        type="search"
        value={words}
        onChange={(e) => setWords(e.target.value)}
        placeholder="Search entity types and their fields"
        aria-label="Search the OBI Standard"
        className="h-[40px] shrink-0 rounded-full border border-[#e8e8e8] bg-white px-[16px] text-[13px] text-[#002766] outline-none placeholder:text-[#bfbfbf] focus:border-[#003a8c]"
      />
      {groups.length === 0 ? (
        <p className="px-[4px] py-[20px] text-center text-[13px] text-[#8c8c8c]">
          No entity types match.
        </p>
      ) : (
        <div className="secondary-scrollbar -mr-[6px] flex min-h-0 flex-col gap-[14px] overflow-y-auto pr-[6px]">
          {groups.map(({ category, items }) => (
            <section key={category.id} className="flex flex-col gap-[7px]">
              <h3 className="flex items-center gap-[7px] px-[4px] text-[11px] leading-[15px] font-bold tracking-[0.8px] text-[#8c8c8c] uppercase">
                <span
                  className="size-[7px] rounded-full"
                  style={{ background: categoryColor(category.id) }}
                  aria-hidden="true"
                />
                {category.title}
                <span className="font-normal tracking-normal normal-case">{items.length}</span>
              </h3>
              <ul className="flex flex-col gap-[7px]">
                {items.map((e) => {
                  const on = e.slug === selected?.slug;
                  return (
                    <li key={e.slug}>
                      <button
                        type="button"
                        aria-pressed={on}
                        data-learn="row"
                        onClick={() => onSelect(e.slug)}
                        className={cn(
                          'flex w-full flex-col gap-[3px] rounded-[12px] p-[11px] text-left transition-shadow',
                          on
                            ? 'bg-[#bae7ff] shadow-[inset_0_0_0_1.5px_#003a8c]'
                            : 'bg-white shadow-[inset_0_0_0_1px_#f0f0f0] hover:shadow-[inset_0_0_0_1px_#d9d9d9]'
                        )}
                      >
                        <span className="text-[14px] leading-[19px] font-semibold text-[#002766]">
                          {e.title}
                        </span>
                        <span className="line-clamp-2 text-[12px] leading-[17px] text-[#8c8c8c]">
                          {e.short}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

/** The right-hand side: the chosen entity type, in the standard's own layout. */
export function StandardCard({
  slug,
  onSelect,
  className,
}: {
  slug: string | null;
  onSelect: (slug: string) => void;
  className?: string;
}) {
  const entity = chosen(slug);
  return (
    <section className={cn(className, 'pt-[28px] pr-[44px] pb-[34px] pl-[40px]')}>
      {entity ? (
        <StandardEntityDetail entity={entity} onSelectEntity={onSelect} />
      ) : (
        <p className="text-[15px] text-[#8c8c8c]">Choose an entity type.</p>
      )}
    </section>
  );
}
