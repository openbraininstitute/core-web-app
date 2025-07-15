'use client';

import AllTypesBlock from '@/components/documentation/glossary/cell-types/all-types-block';
// import { useFetchEntityTypes } from '@/components/documentation/hooks/use-entitycore-cell_type-for-glossary';
// import { CellTypeProps } from '@/components/explore-section/Circuit/type';

export default function CellTypePage() {
  // const mTypeContent = useFetchEntityTypes({ cellType: 'm-type' });
  // const eTypeContent = useFetchEntityTypes({ cellType: 'e-type' });

  // const mTypeData: CellTypeProps[] = (mTypeContent.data?.data ?? []).map((item: any) => ({
  //   ...item,
  //   creation_date: item.creation_date ?? '',
  //   update_date: item.update_date ?? '',
  // })) as CellTypeProps[];

  // const eTypeData: CellTypeProps[] = (eTypeContent.data?.data ?? []).map((item: any) => ({
  //   ...item,
  //   creation_date: item.creation_date ?? '',
  //   update_date: item.update_date ?? '',
  // })) as CellTypeProps[];

  return (
    <div className="relative ml-32 flex w-full flex-col">
      <header>
        <h1 className="text-primary-3 mb-4 text-xl font-bold">Cell Types</h1>
      </header>
      <div className="flex flex-col gap-4 text-white">
        <AllTypesBlock cellType="m-type" />
        <AllTypesBlock cellType="e-type" />
      </div>
    </div>
  );
}
