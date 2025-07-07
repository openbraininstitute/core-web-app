'use client';

import { Metadata } from 'next';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import AllTypesBlock from './all-types-block';

const metadata: Metadata = {
  title: 'Glossary cell types definitions',
  description: 'Explore the glossary cell types definitions in our documentation.',
};

export default function CellTypeDefinitionsFullList() {
  const { slug } = useParams();
  const searchParams = useSearchParams();
  const [highlightedCellType, setHighlightedCellType] = useState<string | null>(null);

  const cellTypeParam = searchParams.get('cell-type');

  useEffect(() => {
    if (cellTypeParam) {
      const element = document.getElementById(cellTypeParam);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setHighlightedCellType(cellTypeParam);
      }
    }
  }, [cellTypeParam]);

  return (
    <div className="relative flex w-full flex-col gap-4 text-white">
      <AllTypesBlock
        cellType={slug as 'm-type' | 'e-type'}
        highlightedCellType={highlightedCellType}
        setHighlightedCellType={setHighlightedCellType}
      />
    </div>
  );
}
