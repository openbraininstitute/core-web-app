import Image from 'next/image';

import { MEModelsProps } from '@/ui/segments/reports/obi-showcases/showcase-type';
import truncateText from '@/util/truncate';

const columns = () => {
  return [
    {
      title: 'Name',
      key: 'name',
      width: 150,
      ellipsis: true,
      render: (_value: any, record: MEModelsProps, _index: number) => (
        <div className="font-normal">{truncateText(record.name, 30)}</div>
      ),
    },
    {
      title: 'Morphology',
      key: 'morphologyThumbnail',
      width: '150px',
      render: (_value: any, record: MEModelsProps, _index: number) => (
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
      title: 'Trace',
      key: 'traceThumbnail',
      width: '150px',
      render: (_value: any, record: MEModelsProps, _index: number) => (
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
      title: 'Validated',
      key: 'validated',
      width: 80,
      render: (_value: any, record: MEModelsProps, _index: number) => (
        <div className="font-normal">{record.validated ? 'Yes' : 'No'}</div>
      ),
    },
    {
      title: 'Brain region',
      key: 'brainRegion',
      width: '200px',
      render: (_value: any, record: MEModelsProps, _index: number) => (
        <div className="font-normal">{record.brainRegion}</div>
      ),
    },
    {
      title: 'M-type',
      key: 'mType',
      width: '100px',
      render: (_value: any, record: MEModelsProps, _index: number) => (
        <div className="font-normal">{record.mType}</div>
      ),
    },
    {
      title: 'E-type',
      key: 'eType',
      width: '100px',
      render: (_value: any, record: MEModelsProps, _index: number) => (
        <div className="font-normal">{record.eType}</div>
      ),
    },
    {
      title: 'Species',
      key: 'species',
      width: '150px',
      render: (_value: any, record: MEModelsProps, _index: number) => (
        <div className="font-normal">{record.species}</div>
      ),
    },
    {
      title: 'Created by',
      key: 'createdBy',
      width: '150px',
      render: (_value: any, record: MEModelsProps, _index: number) => (
        <div className="font-normal">{record.createdBy}</div>
      ),
    },
    {
      title: 'Creation date',
      key: 'creationDate',
      width: '150px',
      render: (_value: any, record: MEModelsProps, _index: number) => {
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
