'use client';

import { Pagination, PaginationProps } from 'antd';
import { useMemo, useState } from 'react';

import { Metadata } from 'next';
import { useParams } from 'next/navigation';
import { useFetchEntityTypes } from '../../hooks/use-entitycore-cell_type-for-glossary';

import GlossaryMTypeCard from '../glossary-m-type-card';

export const metadata: Metadata = {
  title: 'Glossary cell types definitions',
  description: 'Explore the glossary cell types definitions in our documentation.',
};

export default function AllTypesBlock() {
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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const itemRender: PaginationProps['itemRender'] = (page, type, originalElement) => {
    if (type === 'page' && (page === 1 || page === totalPages)) {
      return null;
    }
    return originalElement;
  };

  const title = slug === 'm-type' ? 'Morphological types (m-types)' : 'Electrical types (e-types)';

  return (
    <div className="relative flex w-full flex-col gap-4 text-white">
      <header className="bg-primary-9 fixed top-0 z-50 flex w-[550px] flex-row items-center justify-between pt-7 pb-3">
        <h2 className="text-2xl font-bold capitalize">{title}</h2>

        <Pagination
          current={currentPage}
          total={data ? data.length : 0}
          onChange={handlePageChange}
          pageSize={itemsPerPage}
          itemRender={itemRender}
          showSizeChanger={false}
          showLessItems
        />
      </header>

      <div className="flex flex-col gap-y-12 pt-16">
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
