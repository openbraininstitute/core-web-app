'use client';

import { Metadata } from 'next';
import { useParams } from 'next/navigation';
import AllTypesBlock from './all-types-block';

export const metadata: Metadata = {
  title: 'Glossary cell types definitions',
  description: 'Explore the glossary cell types definitions in our documentation.',
};

export default function CellTypeDefinitionsFullList() {
  const { slug } = useParams();

  const title = slug === 'm-type' ? 'Morphological types (m-types)' : 'Electrical types (e-types)';

  return (
    <div className="relative flex w-full flex-col gap-4 text-white">
      <header className="bg-primary-9 fixed top-0 z-50 flex w-[50vw] pt-7">
        <h2 className="text-2xl font-bold capitalize">{title}</h2>
      </header>
      <AllTypesBlock />
    </div>
  );
}
