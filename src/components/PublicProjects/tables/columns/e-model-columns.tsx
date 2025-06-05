import { Tooltip } from 'antd';
import Image from 'next/image';
import { EModelsProps } from '../../type/artifactsType';

const columns = () => {
  return [
    {
      title: 'Name',
      key: 'name',
      width: '100px',
      render: (_value: any, record: EModelsProps, _index: number) => (
        <div className="overflow-hidden text-ellipsis whitespace-nowrap font-normal">
          {record.name}
        </div>
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
      title: 'MCS',
      key: 'modelCumulatedScore',
      width: '80px',
      render: (_value: any, record: EModelsProps, _index: number) => (
        <Tooltip title="Model Cumulated Score" placement="top">
          <span className="cursor-pointer font-normal">{record.modelCumulatedScore}</span>
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
      title: 'Creation date',
      key: 'creationDate',
      width: '150px',
      render: (_value: any, record: EModelsProps, _index: number) => (
        <div className="font-normal">{record.creationDate}</div>
      ),
    },
  ];
};

export default columns;
