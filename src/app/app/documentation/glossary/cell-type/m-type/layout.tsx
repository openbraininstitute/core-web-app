'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, { useCallback, useState } from 'react';

import { useFetchEntityTypes } from '@/components/documentation/hooks/use-entitycore-cell_type-for-glossary';
import { CellTypeProps } from '@/components/explore-section/Circuit/type';
import { slugifyForUrl } from '@/components/explore-section/utils';
import { classNames } from '@/util/utils';

type CellTypeDefinitionsFullListProps = {
  highlightedCellType: string | null;
  setHighlightedCellType: (slug: string | null) => void;
};

type CellTypeLayoutProps = {
  children: React.ReactNode;
};

export default function CellTypeLayout({ children }: CellTypeLayoutProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedCellType, setHighlightedCellType] = useState<string | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const currentCellType = searchParams.get('cell-type') || '';

  const pathSegments = pathname.split('/').filter(Boolean);
  const cellTypeIndex = pathSegments.indexOf('cell-type') + 1;
  const cellType = pathSegments[cellTypeIndex] === 'm-type' ? 'm-type' : 'e-type';

  const cellcontent = useFetchEntityTypes({
    cellType,
  });

  const data: CellTypeProps[] = (cellcontent.data?.data ?? []).map((item: any) => ({
    ...item,
    creation_date: item.creation_date ?? '',
    update_date: item.update_date ?? '',
  })) as CellTypeProps[];

  const sortedData = data.sort((a, b) => a.pref_label.localeCompare(b.pref_label));

  const filteredData = sortedData.filter((item) =>
    item.pref_label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleScrollTo = useCallback((slug: string) => {
    const element = document.getElementById(slug);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handleItemClick = useCallback(
    (slug: string) => {
      const params = new URLSearchParams(searchParams);
      params.set('cell-type', slug);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
      handleScrollTo(slug);
      setHighlightedCellType(slug);
    },
    [pathname, searchParams, router, handleScrollTo]
  );

  return (
    <div className="relative flex w-full flex-row">
      <div className="no-scrollbar fixed ml-12 flex h-screen w-[220px] flex-col gap-y-3 overflow-y-auto pl-10 text-base text-white">
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

        {filteredData?.map((item: CellTypeProps) => {
          const slug = slugifyForUrl(item.pref_label);
          const isActive = slug === currentCellType;
          return (
            <button
              type="button"
              aria-label={`Go to ${item.pref_label} cell type`}
              key={item.pref_label}
              onClick={() => handleItemClick(slug)}
              className={classNames(
                'text-left text-lg',
                isActive ? 'font-bold text-white' : 'text-primary-1 font-normal'
              )}
            >
              {item.pref_label}
            </button>
          );
        })}
      </div>
      <div className="ml-[320px]">
        {React.Children.map(children, (child) =>
          React.isValidElement<CellTypeDefinitionsFullListProps>(child)
            ? React.cloneElement(child, {
                highlightedCellType,
                setHighlightedCellType,
              } as CellTypeDefinitionsFullListProps)
            : child
        )}
      </div>
    </div>
  );
}
