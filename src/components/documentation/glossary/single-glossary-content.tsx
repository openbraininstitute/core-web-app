'use client';

import { useParams } from 'next/navigation';
import { useSanityContentForGlossary } from '@/components/documentation/hooks/use-sanity-content-for-glossary';
import Slugify from '@/util/slugify';
import ItemCard from '../global/item-card';

export default function SingleGlossaryContent() {
  const content = useSanityContentForGlossary();

  const { slug } = useParams();

  const activeItem = content.find((item) => Slugify(item.Name) === slug);

  if (!activeItem) {
    return <div>Glossary item not found.</div>;
  }
  return (
    <div className="ml-24">
      <ItemCard content={activeItem} />
    </div>
  );
}
