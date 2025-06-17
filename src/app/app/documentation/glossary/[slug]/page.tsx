'use client';

import { useParams } from 'next/navigation';

import GlossaryContent from '@/components/documentation/glossary/glossary-content';
import { useSanityContentForGlossary } from '@/components/documentation/hooks/use-sanity-content-for-glossary';
import Slugify from '@/util/slugify';

export default function SingleGlossaryItemPage() {
  const content = useSanityContentForGlossary();

  const { slug } = useParams();

  const activeItem = content.find((item) => Slugify(item.Name) === slug);

  return (
    <div className="w-full">
      {activeItem ? <GlossaryContent content={activeItem} /> : <div>Glossary item not found.</div>}
    </div>
  );
}
