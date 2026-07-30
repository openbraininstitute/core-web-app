import Image from 'next/image';

import truncateText from '@/util/truncate';

import type { SimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { MEModelsProps } from '@/ui/segments/reports/obi-showcases/showcase-type';

const columns = (): Array<SimpleColumn<MEModelsProps>> => {
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
      width: { width: 150 },
      renderCell: (record) => (
        <div
          className="font-normal"
          style={{
            maxWidth: '150px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          <Image
            src={record.morphologyThumbnail ?? '/placeholder.png'}
            alt="Response thumbnail"
            width="150"
            height="100"
          />
        </div>
      ),
    },
    {
      id: 'traceThumbnail',
      header: 'Trace',
      width: { width: 150 },
      renderCell: (record) => (
        <div className="font-normal">
          <Image
            src={record.traceThumbnail ?? '/placeholder.png'}
            alt="Response thumbnail"
            width="150"
            height="100"
          />
        </div>
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
