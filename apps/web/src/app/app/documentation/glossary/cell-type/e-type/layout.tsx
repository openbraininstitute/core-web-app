'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import AllTypesBlock from '@/components/documentation/glossary/cell-types/all-types-block';

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
        cellType={slug as 'e-type'}
        highlightedCellType={highlightedCellType}
        setHighlightedCellType={setHighlightedCellType}
      />
    </div>
  );
}
