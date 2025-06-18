'use client';

import { useMemo, useState } from 'react';

import { Pagination, PaginationProps } from 'antd';
import { Metadata } from 'next';
import { useParams } from 'next/navigation';

import { useFetchEntityTypes } from '@/components/documentation/hooks/use-entitycore-cell_type-for-glossary';

import GlossaryMTypeCard from '@/components/documentation/glossary/glossary-m-type-card';

import styles from '@/components/documentation/global/documentation-global.module.css';

export const metadata: Metadata = {
  title: 'Glossary cell types definitions',
  description: 'Explore the glossary cell types definitions in our documentation.',
};

export default function CellTypeDefinitionsFullList() {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 20;
  const { slug } = useParams();

  const cellType = slug === 'm-type' ? 'm-type' : 'e-type';
  const filter = useMemo(() => ({ order_by: 'pref_label' }), []);
  const cellcontent = useFetchEntityTypes({
    cellType,
    filter,
  });
  const { data: cellData } = cellcontent;
  const data = cellData?.data;
  const totalPages = data ? Math.ceil(data.length / itemsPerPage) : 0;

  const paginatedData = data?.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const itemRender: PaginationProps['itemRender'] = (page, type, originalElement) => {
    if (type === 'page' && (page === 1 || page === totalPages)) {
      return null; // Skip rendering the first and last pages
    }
    return originalElement; // Render the default element as is
  };

  return (
    <div className="relative flex w-full flex-col gap-4 text-white">
      <header className="bg-primary-9 fixed top-0 z-50 flex w-[50vw] flex-row items-center justify-between pt-7 pb-3">
        <h2 className="text-2xl font-bold capitalize">{slug}s</h2>

        {/* Pagination */}
        <Pagination
          current={currentPage}
          total={data ? data.length : 0}
          onChange={handlePageChange}
          pageSize={itemsPerPage}
          itemRender={itemRender}
          showSizeChanger={false}
          showLessItems
          className={styles.pagination}
        />
      </header>

      {/* Items List */}
      <div className="flex flex-col gap-y-12">
        {(paginatedData?.length ?? 0) > 0 ? (
          paginatedData!.map((item: any) => (
            <GlossaryMTypeCard key={item.pref_label} content={item} />
          ))
        ) : (
          <p>No items found</p>
        )}
      </div>
    </div>
  );
}
