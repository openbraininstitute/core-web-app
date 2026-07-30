import { Tooltip } from 'antd';
import Image from 'next/image';

import truncateText from '@/util/truncate';

import type { SimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { EModelsProps } from '../../type/artifactsType';

function formatDate(isoDateString: string | null) {
  if (!isoDateString) return '';
  const date = new Date(isoDateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

const columns = (): Array<SimpleColumn<EModelsProps>> => {
  return [
    {
      id: 'name',
      header: 'Name',
      width: { width: 150 },
      renderCell: (record) => <div className="font-normal">{truncateText(record.name, 30)}</div>,
    },
    {
      id: 'response',
      header: 'Response',
      width: { width: 150 },
      renderCell: (record) => (
        <div className="font-normal">
          <Image src={record.response} alt="Response thumbnail" width="150" height="100" />
        </div>
      ),
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
      id: 'modelCumulatedScore',
      header: 'Model Cumulated Score',
      width: { width: 200 },
      renderCell: (record) => (
        <Tooltip title="Model Cumulated Score" placement="top">
          <div className="cursor-pointer font-normal">{record.modelCumulatedScore}</div>
        </Tooltip>
      ),
    },
    {
      id: 'species',
      header: 'Species',
      width: { width: 150 },
      renderCell: (record) => <div className="font-normal">{record.species}</div>,
    },
    {
      id: 'contributors',
      header: 'Contributors',
      width: { width: 150 },
      renderCell: (record) => <div className="font-normal">{record.contributors}</div>,
    },
    {
      id: 'creationDate',
      header: 'Registration date',
      width: { width: 150 },
      renderCell: (record) => <div className="font-normal">{formatDate(record.creationDate)}</div>,
    },
  ];
};

export default columns;
