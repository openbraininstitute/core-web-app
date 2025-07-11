'use client';

import { useState } from 'react';

import AllTypesBlock from '@/components/documentation/glossary/cell-types/all-types-block';
import { useFetchEntityTypes } from '@/components/documentation/hooks/use-entitycore-cell_type-for-glossary';
import { CellTypeProps } from '@/components/explore-section/Circuit/type';
import { classNames } from '@/util/utils';

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

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  return (
    <div className="relative ml-24 flex w-full flex-col">
      <header>
        <h1 className="text-primary-3 mb-4 text-xl font-bold">Cell Types</h1>
      </header>
      <div className="flex flex-nowrap gap-1 overflow-x-auto">
        {alphabet.map((letter) => (
          <button
            key={letter}
            type="button"
            onClick={() => {
              if (validLetters.has(letter)) {
                setSelectedLetter(letter);
              }
            }}
            disabled={!validLetters.has(letter)}
            className={classNames(
              'flex-shrink-0 rounded-md px-3 py-1 text-sm font-medium',
              selectedLetter === letter
                ? 'bg-primary-3 text-primary-9'
                : 'text-primary-1 hover:bg-primary-5 bg-transparent',
              !validLetters.has(letter) ? 'cursor-not-allowed opacity-50' : 'hover:bg-primary-5'
            )}
          >
            {letter}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSelectedLetter(null)}
          className={classNames(
            'flex-shrink-0 rounded-md px-3 py-1 text-sm font-medium',
            selectedLetter === null
              ? 'bg-primary-3 text-white'
              : 'bg-primary-7 text-primary-1 hover:bg-primary-5'
          )}
        >
          All
        </button>
      </div>
      <div className="flex flex-col gap-4 text-white">
        <AllTypesBlock cellType="m-type" selectedLetter={selectedLetter} />
        <AllTypesBlock cellType="e-type" selectedLetter={selectedLetter} />
      </div>
    </div>
  );
}
