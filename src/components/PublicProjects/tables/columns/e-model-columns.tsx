import { Tooltip } from 'antd';
import Image from 'next/image';
import truncateText from '@/util/truncate';
import type { EModelsProps } from '../../type/artifactsType';

function formatDate(isoDateString: string | null) {
  if (!isoDateString) return '';
  const date = new Date(isoDateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

const columns = () => {
  return [
    {
      title: 'Name',
      key: 'name',
      width: 150,
      render: (_value: any, record: EModelsProps, _index: number) => (
        <div className="font-normal">{truncateText(record.name, 30)}</div>
      ),
    },
    {
      title: 'Response',
      key: 'response',
      width: '150px',
      render: (_value: any, record: EModelsProps, _index: number) => (
        <div className="font-normal">
          <Image src={record.response} alt="Response thumbnail" width="150" height="100" />
        </div>
      ),
    },
    {
      title: 'Brain region',
      key: 'brainRegion',
      width: '200px',
      render: (_value: any, record: EModelsProps, _index: number) => (
        <div className="font-normal">{record.brainRegion}</div>
      ),
    },
    {
      title: 'M-type',
      key: 'mType',
      width: '100px',
      render: (_value: any, record: EModelsProps, _index: number) => (
        <div className="font-normal">{record.mType}</div>
      ),
    },
    {
      title: 'Model Cumulated Score',
      key: 'modelCumulatedScore',
      width: 200,
      render: (_value: any, record: EModelsProps, _index: number) => (
        <Tooltip title="Model Cumulated Score" placement="top">
          <div className="cursor-pointer font-normal">{record.modelCumulatedScore}</div>
        </Tooltip>
      ),
    },
    {
      title: 'Species',
      key: 'species',
      width: '150px',
      render: (_value: any, record: EModelsProps, _index: number) => (
        <div className="font-normal">{record.species}</div>
      ),
    },
    {
      title: 'Contributors',
      key: 'contributors',
      width: '150px',
      render: (_value: any, record: EModelsProps, _index: number) => (
        <div className="font-normal">{record.contributors}</div>
      ),
    },
    {
      title: 'Registration date',
      key: 'creationDate',
      width: '150px',
      render: (_value: any, record: EModelsProps, _index: number) => {
        const dateFormatted = formatDate(record.creationDate);

        return <div className="font-normal">{dateFormatted}</div>;
      },
    },
  ];
};

export default columns;
