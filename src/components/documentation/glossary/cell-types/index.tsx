'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import AllTypesBlock from './all-types-block';

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
    <div className="relative ml-32 flex max-w-3/4 flex-col gap-4 text-white">
      <h1 className="text-primary-3 mb-4 text-xl font-bold">
        {slug === 'm-type' ? 'M-Type Cell Types' : 'E-Type Cell Types'}
      </h1>
      <AllTypesBlock
        cellType={slug as 'm-type' | 'e-type'}
        highlightedCellType={highlightedCellType}
        setHighlightedCellType={setHighlightedCellType}
      />
    </div>
  );
}
