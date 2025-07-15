'use client';

import { useState } from 'react';

import AllTypesBlock from '@/components/documentation/glossary/cell-types/all-types-block';
import { useFetchEntityTypes } from '@/components/documentation/hooks/use-entitycore-cell_type-for-glossary';
import AlphabeticalFilter from '@/components/explore-section/Circuit/global/AlphabeticalFilter';
import { CellTypeProps } from '@/components/explore-section/Circuit/type';

export default function CellTypePage() {
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);

  const mTypeContent = useFetchEntityTypes({ cellType: 'm-type' });
  const eTypeContent = useFetchEntityTypes({ cellType: 'e-type' });

  const mTypeData: CellTypeProps[] = (mTypeContent.data?.data ?? []).map((item: any) => ({
    ...item,
    creation_date: item.creation_date ?? '',
    update_date: item.update_date ?? '',
  })) as CellTypeProps[];

  const eTypeData: CellTypeProps[] = (eTypeContent.data?.data ?? []).map((item: any) => ({
    ...item,
    creation_date: item.creation_date ?? '',
    update_date: item.update_date ?? '',
  })) as CellTypeProps[];

  const validLetters = new Set<string>();
  [...mTypeData, ...eTypeData].forEach((item) => {
    const firstLetter = item.pref_label.charAt(0).toUpperCase();
    if (/[A-Z]/.test(firstLetter)) {
      validLetters.add(firstLetter);
    }
  });

  return (
    <div className="relative ml-24 flex w-full flex-col">
      <header>
        <h1 className="text-primary-3 mb-4 text-xl font-bold">Cell Types</h1>
      </header>
      <AlphabeticalFilter
        data={[...mTypeData, ...eTypeData]}
        selectedLetter={selectedLetter}
        setSelectedLetter={setSelectedLetter}
      />
      <div className="flex flex-col gap-4 text-white">
        <AllTypesBlock cellType="m-type" selectedLetter={selectedLetter} />
        <AllTypesBlock cellType="e-type" selectedLetter={selectedLetter} />
      </div>
    </div>
  );
}
