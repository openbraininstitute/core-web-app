'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

import TermCard from '@/ui/segments/help/glossary/term-card';
import Slugify from '@/util/slugify';

import type { ContentForGlossaryItem } from '@/components/documentation/type';

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

const toSlug = (v: unknown) => Slugify((v ?? '').toString());

const asArray = (value: any): any[] => {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.data)) return value.data;
  if (value && value.data && Array.isArray(value.data.data)) return value.data.data;
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

  useEffect(() => {
    if (!termRaw) return;
    const el = document.getElementById(termRaw);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [termRaw]);

  if (!Array.isArray(glossarySections) || glossarySections.length === 0) {
    return <p className="text-primary-9/80">No glossary content available.</p>;
  }

  const dataSection = glossarySections.find((s) => normalize(s.name) === 'data');
  const artifactSection = glossarySections.find((s) => normalize(s.name) === 'artifact');
  const cellSection = glossarySections.find((s) => normalize(s.name) === 'cell');

  const dataItems = asArray(dataSection?.data).map(mapSanityItem);
  const artifactItems = asArray(artifactSection?.data).map(mapSanityItem);
  const cellGroups = asArray(cellSection?.data) as CellGroup[];

  const sortByName = (items: ContentForGlossaryItem[]) =>
    [...items].sort((a, b) =>
      (a.Name ?? '')
        .toString()
        .toLowerCase()
        .localeCompare((b.Name ?? '').toString().toLowerCase())
    );

  return (
    <div className="flex w-full flex-col gap-10">
      {dataItems.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-primary-9 text-2xl font-bold">Data</h2>
          {dataItems.map((content) => (
            <TermCard key={content._id} content={content} sectionType="data" />
          ))}
        </section>
      )}
      {artifactItems.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-primary-9 text-2xl font-bold">Artifact</h2>
          {artifactItems.map((content) => (
            <TermCard key={content._id} content={content} sectionType="artifact" />
          ))}
        </section>
      )}
      {cellGroups.map((group) => {
        const items = sortByName(asArray(group?.data).map(mapCellItem));
        if (!items.length) return null;
        return (
          <section key={group.slug ?? group.name} className="flex flex-col gap-4">
            <h2 className="text-primary-9 text-2xl font-bold">{group.name}</h2>
            {items.map((content) => (
              <TermCard key={content._id} content={content} sectionType="cell" />
            ))}
          </section>
        );
      })}
    </div>
  );
}
