import type { SynaptomeProps } from '@/ui/segments/reports/obi-showcases/showcase-type';

const columns = () => {
  return [
    {
      title: 'Name',
      key: 'name',
      width: '200px',
      render: (_value: any, record: SynaptomeProps, _index: number) => (
        <div className="font-normal">{record.name}</div>
      ),
    },
    {
      title: 'Description',
      key: 'description',
      width: '200px',
      render: (_value: any, record: SynaptomeProps, _index: number) => (
        <div className="font-normal">{record.description}</div>
      ),
    },
    {
      title: 'M-Type',
      key: 'MType',
      width: '100px',
      render: (_value: any, record: SynaptomeProps, _index: number) => (
        <div className="font-normal">{record.MType}</div>
      ),
    },
    {
      title: 'E-Type',
      key: 'EType',
      width: '100px',
      render: (_value: any, record: SynaptomeProps, _index: number) => (
        <div className="font-normal">{record.EType}</div>
      ),
    },
    {
      title: 'Brain region',
      key: 'brainRegion',
      width: '200px',
      render: (_value: any, record: SynaptomeProps, _index: number) => (
        <div className="font-normal">{record.brainRegion}</div>
      ),
    },

    {
      title: 'Species',
      key: 'species',
      width: '150px',
      render: (_value: any, record: SynaptomeProps, _index: number) => (
        <div className="font-normal">{record.species}</div>
      ),
    },
    {
      title: 'Registered By',
      key: 'createdBy',
      width: '150px',
      render: (_value: any, record: SynaptomeProps, _index: number) => (
        <div className="font-normal">{record.createdBy}</div>
      ),
    },
    {
      title: 'Registration Date',
      key: 'creationDate',
      width: '150px',
      render: (_value: any, record: SynaptomeProps, _index: number) => (
        <div className="font-normal">{record.creationDate}</div>
      ),
    },
  ];
};

export default columns;
