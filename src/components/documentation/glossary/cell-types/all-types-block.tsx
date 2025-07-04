'use client';

import { useEffect } from 'react';

import { useFetchEntityTypes } from '@/components/documentation/hooks/use-entitycore-cell_type-for-glossary';
import { CellTypeProps } from '@/components/explore-section/Circuit/type';
import { slugifyForUrl } from '@/components/explore-section/utils';
import { classNames } from '@/util/utils';

import styles from './all-types-block.module.css';

interface SectionItemProps {
  item: CellTypeProps;
  index: number;
  highlightedCellType: string | null;
}

function SectionItem({ item, index, highlightedCellType }: SectionItemProps) {
  const slug = slugifyForUrl(item.pref_label);

  return (
    <section
      key={item.pref_label}
      id={slug}
      className={classNames(
        'scroll-mt-4',
        index !== 0 && 'border-primary-7 border-t pt-4',
        highlightedCellType === slug && styles.highlight
      )}
    >
      <h3 className="text-2xl font-bold text-white">{item.pref_label}</h3>
      <p className="text-primary-1 mt-1">{item.definition || 'No description available.'}</p>
    </section>
  );
}

type AllTypesBlockProps = {
  cellType: 'm-type' | 'e-type';
  highlightedCellType: string | null;
  setHighlightedCellType: (slug: string | null) => void;
};

export default function AllTypesBlock({
  cellType,
  highlightedCellType,
  setHighlightedCellType,
}: AllTypesBlockProps) {
  const cellcontent = useFetchEntityTypes({ cellType });

  const data: CellTypeProps[] = (cellcontent.data?.data ?? []).map((item: any) => ({
    ...item,
    creation_date: item.creation_date ?? '',
    update_date: item.update_date ?? '',
  })) as CellTypeProps[];

  const sortedData = data.sort((a, b) => a.pref_label.localeCompare(b.pref_label));

  useEffect(() => {
    if (highlightedCellType) {
      const timer = setTimeout(() => {
        setHighlightedCellType(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [highlightedCellType, setHighlightedCellType]);

  return (
    <div className="flex flex-col gap-8">
      {sortedData.map((item, index) => (
        <SectionItem
          key={item.pref_label}
          item={item}
          index={index}
          highlightedCellType={highlightedCellType}
        />
      ))}
    </div>
  );
}
