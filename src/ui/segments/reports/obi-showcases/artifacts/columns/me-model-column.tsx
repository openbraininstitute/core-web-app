import Image from 'next/image';

import truncateText from '@/util/truncate';

import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { MEModelsProps } from '@/ui/segments/reports/obi-showcases/showcase-type';

/** Match entitycore ME-model listing preview thumbnails (`me-model-cells.tsx`). */
const PREVIEW_WIDTH = 184;
const PREVIEW_HEIGHT = 108;

function PreviewThumbnail({ src, alt }: { src: string | null; alt: string }) {
  return (
    <Image
      src={src ?? '/placeholder.png'}
      alt={alt}
      width={PREVIEW_WIDTH}
      height={PREVIEW_HEIGHT}
      className="rounded border border-gray-100 bg-white object-contain"
    />
  );
}

const columns = (): Array<ISimpleColumn<MEModelsProps>> => {
  return [
    {
      id: 'name',
      header: 'Name',
      width: { width: 150 },
      renderCell: (record) => <div className="font-normal">{truncateText(record.name, 30)}</div>,
    },
    {
      id: 'morphologyThumbnail',
      header: 'Morphology',
      width: { width: 196, minWidth: 120, resizable: true },
      autoHeight: true,
      renderCell: (record) => (
        <PreviewThumbnail src={record.morphologyThumbnail} alt="Morphology thumbnail" />
      ),
    },
    {
      id: 'traceThumbnail',
      header: 'Trace',
      width: { width: 184, minWidth: 120, resizable: true },
      autoHeight: true,
      renderCell: (record) => (
        <PreviewThumbnail src={record.traceThumbnail} alt="Trace thumbnail" />
      ),
    },
    {
      id: 'validated',
      header: 'Validated',
      width: { width: 80 },
      renderCell: (record) => <div className="font-normal">{record.validated ? 'Yes' : 'No'}</div>,
    },
    {
      id: 'brainRegion',
      header: 'Brain region',
      width: { width: 200 },
      renderCell: (record) => <div className="font-normal">{record.brainRegion}</div>,
    },
    {
      id: 'mType',
      header: 'M-type',
      width: { width: 100 },
      renderCell: (record) => <div className="font-normal">{record.mType}</div>,
    },
    {
      id: 'eType',
      header: 'E-type',
      width: { width: 100 },
      renderCell: (record) => <div className="font-normal">{record.eType}</div>,
    },
    {
      id: 'species',
      header: 'Species',
      width: { width: 150 },
      renderCell: (record) => <div className="font-normal">{record.species}</div>,
    },
    {
      id: 'createdBy',
      header: 'Registered by',
      width: { width: 150 },
      renderCell: (record) => <div className="font-normal">{record.createdBy}</div>,
    },
    {
      id: 'creationDate',
      header: 'Registration date',
      width: { width: 150 },
      renderCell: (record) => {
        const formatDate = (dateInput: string | null) => {
          if (!dateInput) return '21.02.2024'; // Fallback date in DD.MM.YYYY
          const date = new Date(dateInput);
          if (Number.isNaN(date.getTime())) return '21.02.2024'; // Handle invalid dates
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          return `${day}.${month}.${year}`;
        };
        return <div className="font-normal">{formatDate(record.creationDate)}</div>;
      },
    },
  ];
};

export default columns;
