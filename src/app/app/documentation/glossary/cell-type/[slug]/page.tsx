'use client';

import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import GlossaryMTypeCard from '@/components/documentation/glossary/glossary-m-type-card';
import { useFetchEModelEntityTypes } from '@/components/documentation/hooks/use-entitycore-cell_type-for-glossary';
import { classNames } from '@/util/utils';

export default function GlossaryMTypeListPage() {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 20;
  const { slug } = useParams();

  const cellType = slug === 'm-type' ? 'm-type' : 'e-type';
  const cellcontent = useFetchEModelEntityTypes({ cellType });
  const { data: cellData } = cellcontent;
  const data = cellData?.data;

  // Sort data alphabetically
  const sortedData = useMemo(() => {
    if (!data) return [];
    return [...data].sort((a: any, b: any) => a.pref_label?.localeCompare(b.pref_label));
  }, [data]);

  // Calculate pagination
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="relative flex w-full flex-col gap-4 text-white">
      <header className="bg-primary-9 fixed top-0 z-50 flex w-[50vw] flex-row items-center justify-between pt-7 pb-3">
        <h2 className="text-2xl font-bold capitalize">{slug}s</h2>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                type="button"
                aria-label={`Change page to ${page}`}
                key={page}
                onClick={() => handlePageChange(page)}
                className={classNames(
                  'h-6 w-6 text-white',
                  currentPage === page ? 'bg-primary-5' : 'bg-transparent'
                )}
              >
                {page}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Items List */}
      <div className="flex flex-col gap-y-12">
        {paginatedData.length > 0 ? (
          paginatedData.map((item: any) => (
            <GlossaryMTypeCard key={item.pref_label} content={item} />
          ))
        ) : (
          <p>No items found</p>
        )}
      </div>
    </div>
  );
}
