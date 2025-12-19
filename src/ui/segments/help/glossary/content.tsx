'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { ContentForGlossaryItem } from '@/components/documentation/type';
import TermCard from '@/ui/segments/help/glossary/term-card';
import Slugify from '@/util/slugify';

export type CellGroup = {
  name: string;
  slug: string;
  data: any[];
};

export type GlossarySectionInput = {
  name: string;
  data: any[] | CellGroup[];
};

export type GlossaryContentProps = {
  glossarySections: GlossarySectionInput[];
};

const normalize = (s?: string | null) => (s ?? '').trim().toLowerCase();

// Keep consistency of slug with navigation
const toSlug = (v: unknown) => Slugify((v ?? '').toString());

const asArray = (value: any): any[] => {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.data)) return value.data;
  if (value?.data && Array.isArray(value.data.data)) return value.data.data;
  return [];
};

const richTextFromString = (s?: string | null) =>
  s && String(s).trim().length
    ? [
        {
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{ _type: 'span', marks: [], text: String(s) }],
        },
      ]
    : [];

const mapSanityItem = (x: any): ContentForGlossaryItem => ({
  _id: x?._id ?? x?.id ?? toSlug(x?.Name ?? x?.New_suggested_name ?? x?.name ?? ''),
  Name: x?.Name ?? x?.New_suggested_name ?? x?.name ?? 'Untitled',
  definition: Array.isArray(x?.definition) ? x.definition : richTextFromString(x?.Description),
  Data_Type: x?.Data_Type ?? null,
  Status: x?.Status ?? null,
  ...x,
});

const mapCellItem = (x: any): ContentForGlossaryItem => ({
  _id: x?.id ?? x?._id ?? toSlug(x?.pref_label ?? x?.alt_label ?? ''),
  Name: x?.pref_label ?? x?.alt_label ?? 'Untitled',
  definition: Array.isArray(x?.definition) ? x.definition : richTextFromString(x?.definition),
  Data_Type: null,
  Status: null,
  ...x,
});

export default function GlossaryContent({ glossarySections }: GlossaryContentProps) {
  const searchParams = useSearchParams();
  const termRaw = searchParams?.get('term') ?? undefined;
  const term = normalize(termRaw);

  const [selectedLetter, setSelectedLetter] = useState<string>('All');

  if (!Array.isArray(glossarySections) || glossarySections.length === 0) {
    return (
      <section className="col-span-3">
        <p className="text-primary-9/80">No glossary content available.</p>
      </section>
    );
  }

  if (term === 'data' || term === 'data-types' || term === 'datatypes') {
    const dataSection = glossarySections.find((s) => normalize(s.name) === 'data');
    const items = asArray(dataSection?.data).map(mapSanityItem);
    if (!items.length) {
      return (
        <section className="col-span-3">
          <p className="text-primary-9/80">No terms found in “Data”.</p>
        </section>
      );
    }
    return (
      <section className="col-span-3 flex flex-col gap-8">
        <h2 className="text-2xl font-bold">Data</h2>
        {items.map((content) => (
          <TermCard key={content.Name} content={content} sectionType="data" />
        ))}
      </section>
    );
  }

  if (term === 'artifact' || term === 'artifacts' || term === 'artifact-types') {
    const artifactSection = glossarySections.find((s) => normalize(s.name) === 'artifact');
    const items = asArray(artifactSection?.data).map(mapSanityItem);
    if (!items.length) {
      return (
        <section className="col-span-3">
          <p className="text-primary-9/80">No terms found in “Artifact”.</p>
        </section>
      );
    }
    return (
      <section className="col-span-3 flex flex-col gap-8">
        <h2 className="text-2xl font-bold">Artifact</h2>
        {items.map((content) => (
          <TermCard key={content.Name} content={content} sectionType="artifact" />
        ))}
      </section>
    );
  }

  // ---------- CELL LISTS ----------
  if (term === 'm-type' || term === 'e-type') {
    const cellSection = glossarySections.find((s) => normalize(s.name) === 'cell');
    const cellGroups = asArray(cellSection?.data) as CellGroup[];
    const group = cellGroups.find((g) => normalize(g.slug) === term);
    const items = asArray(group?.data).map(mapCellItem);

    if (!items.length) {
      return (
        <section className="col-span-3">
          <p className="text-primary-9/80">
            No entries found for <strong>{term}</strong>.
          </p>
        </section>
      );
    }
    // Alphabetical A–Z filter + sorting + disabled letters
    const alphabet = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

    const sorted = [...items].sort((a, b) => {
      const an = (a.Name ?? '').toString().toLowerCase();
      const bn = (b.Name ?? '').toString().toLowerCase();
      if (an < bn) return -1;
      if (an > bn) return 1;
      return 0;
    });

    const counts: Record<string, number> = alphabet.reduce(
      (acc, letter) => {
        acc[letter] = sorted.filter((it) =>
          (it.Name ?? '').toString().toUpperCase().startsWith(letter),
        ).length;
        return acc;
      },
      {} as Record<string, number>,
    );

    const filtered =
      selectedLetter === 'All'
        ? sorted
        : sorted.filter((it) =>
            (it.Name ?? '').toString().toUpperCase().startsWith(selectedLetter),
          );

    return (
      <section className="col-span-3 flex h-full w-full flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{term.toUpperCase()}</h2>
        </div>

        {/* Alphabet selector */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedLetter('All')}
            className={`rounded px-2 py-1 text-sm ${
              selectedLetter === 'All' ? 'bg-neutral-200 font-semibold' : 'hover:bg-neutral-100'
            }`}
          >
            All
          </button>
          {alphabet.map((ch) => {
            const disabled = counts[ch] === 0;
            return (
              <button
                key={ch}
                type="button"
                onClick={() => !disabled && setSelectedLetter(ch)}
                disabled={disabled}
                className={`rounded px-2 py-1 text-sm ${(() => {
                  if (disabled) return 'cursor-not-allowed opacity-40';
                  if (selectedLetter === ch)
                    return 'shadow-skm-l bg-primary-9 font-semibold text-white';
                  return 'hover:bg-neutral-100';
                })()}`}
                title={disabled ? `No terms for ${ch}` : undefined}
              >
                {ch}
              </button>
            );
          })}
        </div>

        {/* ---------- MULTIPLE TERMS LOOKUP (Cell) ---------- */}
        <div className="flex max-h-[70vh] flex-col gap-8 overflow-y-scroll">
          {filtered.map((content) => (
            <TermCard key={content.Name} content={content} sectionType="cell" />
          ))}
        </div>
      </section>
    );
  }

  // ---------- SINGLE TERM LOOKUP (Data/Artifact) ----------
  if (term) {
    const dataSection = glossarySections.find((s) => normalize(s.name) === 'data');
    const artifactSection = glossarySections.find((s) => normalize(s.name) === 'artifact');

    const dataList = asArray(dataSection?.data);
    const artifactList = asArray(artifactSection?.data);

    const matches = (x: any) => {
      const candidates = [x?.Name, x?.New_suggested_name, x?.name, x?.Description];
      return candidates.some((c) => normalize(toSlug(c)) === term);
    };

    const foundRaw = [...dataList, ...artifactList].find(matches);
    if (foundRaw) {
      const content = mapSanityItem(foundRaw);
      const sectionType = dataList.includes(foundRaw) ? 'data' : 'artifact';
      return (
        <section className="col-span-3 flex flex-col">
          <TermCard content={content} sectionType={sectionType} />
        </section>
      );
    }

    return (
      <section className="col-span-3">
        <p className="text-red-700">
          No entry found for “{termRaw}”. Try another item from the left menu.
        </p>
      </section>
    );
  }

  // Show Data section content by default when no term is selected
  const dataSection = glossarySections.find((s) => normalize(s.name) === 'data');
  const items = asArray(dataSection?.data).map(mapSanityItem);

  if (!items.length) {
    return (
      <section className="col-span-3">
        <p className="text-primary-9/80">No terms found in &quot;Data&quot;.</p>
      </section>
    );
  }

  return (
    <section className="col-span-3 flex flex-col gap-8">
      <h2 className="text-2xl font-bold">Data</h2>
      {items.map((content) => (
        <TermCard key={content.Name} content={content} sectionType="data" />
      ))}
    </section>
  );
}
