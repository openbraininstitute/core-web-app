'use client';

import { useEffect, useState } from 'react';

import { getEtypes } from '@/api/entitycore/queries/annotations/etype';
import { getMtypes } from '@/api/entitycore/queries/annotations/mtype';
import { useSanityContentForArtifactTypes } from '@/components/documentation/hooks/use-sanity-content-for-artifact-types';
import { useSanityContentForExperimentsModels } from '@/components/documentation/hooks/use-sanity-content-for-data-type';
import GlossaryContent from '@/ui/segments/help/glossary/content';
import GlossaryNavigation from '@/ui/segments/help/glossary/navigation';

import type { CellTypeContentForGlossaryItem, ContentForGlossaryItem } from '@/types/help/type';

export type CellTypeContentProps = {
  name: string;
  slug: string;
  data: CellTypeContentForGlossaryItem[];
};

export default function GlossarySection({ slot }: { slot?: 'nav' | 'content' } = {}) {
  const [mTypeContent, setMTypeContent] = useState<any[]>([]);
  const [eTypeContent, setETypeContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [etypesRes, mtypesRes] = await Promise.all([getEtypes({}), getMtypes({})]);

        const etypes = etypesRes?.data ?? [];
        const mtypes = mtypesRes?.data ?? [];

        setMTypeContent([...mtypes]);
        setETypeContent([...etypes]);
      } catch (error) {
        throw new Error(`Failed to fetch cell types: ${error}`);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const dataContent: ContentForGlossaryItem[] =
    useSanityContentForExperimentsModels() as ContentForGlossaryItem[];
  const artifactContent: ContentForGlossaryItem[] =
    useSanityContentForArtifactTypes() as ContentForGlossaryItem[];

  const glossarySectionsTypes = [
    {
      name: 'Data',
      data: dataContent,
    },
    {
      name: 'Artifact',
      data: artifactContent,
    },
    {
      name: 'Cell',
      data: [
        {
          name: 'M-type',
          slug: 'm-type',
          data: mTypeContent,
        },
        {
          name: 'E-type',
          slug: 'e-type',
          data: eTypeContent,
        },
      ],
    },
  ];

  if (loading) {
    return <div>Loading...</div>;
  }

  if (slot === 'nav') {
    return (
      <div className="border-neutral-2 bg-background w-full overflow-y-auto rounded-2xl border p-4">
        <GlossaryNavigation glossarySectionsTypes={glossarySectionsTypes} />
      </div>
    );
  }

  if (slot === 'content') {
    return (
      <div className="mb-32 h-full max-h-[calc(100vh-18rem)] w-full overflow-y-auto p-4">
        <GlossaryContent glossarySections={glossarySectionsTypes} />
      </div>
    );
  }

  return (
    <div className="border-neutral-2 bg-background mb-32 flex h-full max-h-[calc(100vh-18rem)] w-full overflow-hidden rounded-2xl border p-4">
      <div className="border-neutral-2 w-1/4 shrink-0 overflow-y-auto border-r pr-4">
        <GlossaryNavigation glossarySectionsTypes={glossarySectionsTypes} />
      </div>
      <div className="w-3/4 overflow-y-auto pl-4">
        <GlossaryContent glossarySections={glossarySectionsTypes} />
      </div>
    </div>
  );
}
