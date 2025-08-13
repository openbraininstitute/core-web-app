'use client';

import { useSearchParams } from 'next/navigation';

import TermCard from './term-card';

import type { ContentForGlossaryItem } from '@/components/documentation/type';
import Slugify from '@/util/slugify';

// ---------------- Types expected in props ----------------
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

const toSlug = (v: unknown) => {
  const s = (v ?? '').toString();
  return Slugify(s);
};

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
  const term = normalize(termRaw);

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
      <section className="col-span-3 flex flex-col gap-8 overflow-y-scroll">
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
      <section className="col-span-3 flex flex-col gap-8 overflow-y-scroll">
        {items.map((content) => (
          <TermCard key={content.Name} content={content} sectionType="artifact" />
        ))}
      </section>
    );
  }

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

    const sectionType = 'cell';
    return (
      <section className="col-span-3 flex flex-col gap-8 overflow-y-scroll">
        {items.map((content) => (
          <TermCard key={content.Name} content={content} sectionType={sectionType} />
        ))}
      </section>
    );
  }

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
      let sectionType: string = 'unknown';
      if (dataSection) {
        sectionType = 'data';
      } else if (artifactSection) {
        sectionType = 'artifact';
      }
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

  return (
    <section className="col-span-3">
      <p className="text-primary-9/80">Select a term on the left to see its definition.</p>
    </section>
  );
}
