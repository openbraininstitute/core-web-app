import Image from 'next/image';
import { MEModelProps } from '../../type/artifactsType';

const columns = () => {
  return [
    {
      title: 'Name',
      key: 'name',
      width: '200px',
      render: (_value: any, record: MEModelProps, _index: number) => (
        <div className="font-normal">{record.name}</div>
      ),
    },
    {
      title: 'Morphology',
      key: 'morphologyThumbnail',
      width: '150px',
      render: (_value: any, record: MEModelProps, _index: number) => (
        <div className="font-normal">
          <Image
            src={record.morphologyThumbnail}
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
      render: (_value: any, record: MEModelProps, _index: number) => (
        <div className="font-normal">
          <Image src={record.traceThumbnail} alt="Response thumbnail" width="150" height="100" />
        </div>
      ),
    },
    {
      title: 'Validated',
      key: 'validated',
      width: '200px',
      render: (_value: any, record: MEModelProps, _index: number) => (
        <div className="font-normal">{record.validated ? 'Yes' : 'No'}</div>
      ),
    },
    {
      title: 'Brain region',
      key: 'brainRegion',
      width: '200px',
      render: (_value: any, record: MEModelProps, _index: number) => (
        <div className="font-normal">{record.brainRegion}</div>
      ),
    },
    {
      title: 'M-Type',
      key: 'mType',
      width: '100px',
      render: (_value: any, record: MEModelProps, _index: number) => (
        <div className="font-normal">{record.mType}</div>
      ),
    },
    {
      title: 'E-Type',
      key: 'eType',
      width: '100px',
      render: (_value: any, record: MEModelProps, _index: number) => (
        <div className="font-normal">{record.eType}</div>
      ),
    },
    {
      title: 'Species',
      key: 'species',
      width: '150px',
      render: (_value: any, record: MEModelProps, _index: number) => (
        <div className="font-normal">{record.species}</div>
      ),
    },
    {
      title: 'Created by',
      key: 'createdBy',
      width: '150px',
      render: (_value: any, record: MEModelProps, _index: number) => (
        <div className="font-normal">{record.createdBy}</div>
      ),
    },
    {
      title: 'Creation Date',
      key: 'creationDate',
      width: '150px',
      render: (_value: any, record: MEModelProps, _index: number) => (
        <div className="font-normal">{record.creationDate}</div>
      ),
    },
  ];
};

export default columns;
