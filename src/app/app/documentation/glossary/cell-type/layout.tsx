'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { useFetchEntityTypes } from '@/components/documentation/hooks/use-entitycore-cell_type-for-glossary';
import { CellTypeProps } from '@/components/explore-section/Circuit/type';
import { classNames } from '@/util/utils';

export function slugify(text: string): string {
  return text.replace(/\s+/g, '-');
}

export default function CellTypeLayout({ children }: { children: React.ReactNode }) {
  const [searchTerm, setSearchTerm] = useState('');
  const pathname = usePathname();

  // Determine cellType based on URL path
  const pathSegments = pathname.split('/').filter(Boolean);
  const cellTypeIndex = pathSegments.indexOf('cell-type') + 1;
  const cellType = pathSegments[cellTypeIndex] === 'm-type' ? 'm-type' : 'e-type';
  const currentSlug = pathSegments[pathSegments.length - 1]; // e.g., 'acb_msn3' or 'm-type'/'e-type'

  const cellcontent = useFetchEntityTypes({
    cellType,
  });

  const data: CellTypeProps[] = (cellcontent.data?.data ?? []).map((item: any) => ({
    ...item,
    creation_date: item.creation_date ?? '',
    update_date: item.update_date ?? '',
  })) as CellTypeProps[];

  const filteredData = data.filter((item) =>
    item.pref_label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative flex w-full flex-row">
      <div className="fixed flex w-[220px] flex-col gap-y-3 pl-10 text-base text-white">
        <div>
          <h3 className="text-primary-3 mb-4 text-xl font-bold">
            {cellType === 'm-type' ? 'M-Types' : 'E-Types'}
          </h3>
        </div>
        <div>
          <input
            type="text"
            placeholder="Search types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-primary-6 placeholder:text-primary-2 w-full rounded-4xl border border-solid bg-transparent px-5 py-1 focus:outline-none"
            aria-label="Search cell types"
          />
        </div>
        <Link
          href={`/app/documentation/glossary/cell-type/${cellType}`}
          className={classNames(
            'text-lg text-white',
            currentSlug === cellType ? 'font-bold' : 'font-normal'
          )}
          aria-label="Select all glossary item"
        >
          All
        </Link>

        {filteredData?.map((item: CellTypeProps) => {
          const isActive = slugify(item.pref_label) === currentSlug;
          const link = `/app/documentation/glossary/cell-type/${cellType}/${slugify(item.pref_label)}`;
          return (
            <Link
              key={item.pref_label}
              href={link}
              className={classNames(
                'text-lg',
                isActive ? 'font-bold text-white' : 'text-primary-1 font-normal'
              )}
            >
              {item.pref_label}
            </Link>
          );
        })}
      </div>
      <div className="ml-[260px]">{children}</div>
    </div>
  );
}
