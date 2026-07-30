import type { SimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { SynaptomeProps } from '@/ui/segments/reports/obi-showcases/showcase-type';

const columns = (): Array<SimpleColumn<SynaptomeProps>> => {
  return [
    {
      id: 'name',
      header: 'Name',
      width: { width: 200 },
      renderCell: (record) => <div className="font-normal">{record.name}</div>,
    },
    {
      id: 'description',
      header: 'Description',
      width: { width: 200 },
      renderCell: (record) => <div className="font-normal">{record.description}</div>,
    },
    {
      id: 'MType',
      header: 'M-Type',
      width: { width: 100 },
      renderCell: (record) => <div className="font-normal">{record.MType}</div>,
    },
    {
      id: 'EType',
      header: 'E-Type',
      width: { width: 100 },
      renderCell: (record) => <div className="font-normal">{record.EType}</div>,
    },
    {
      id: 'brainRegion',
      header: 'Brain region',
      width: { width: 200 },
      renderCell: (record) => <div className="font-normal">{record.brainRegion}</div>,
    },
    {
      id: 'species',
      header: 'Species',
      width: { width: 150 },
      renderCell: (record) => <div className="font-normal">{record.species}</div>,
    },
    {
      id: 'createdBy',
      header: 'Registered By',
      width: { width: 150 },
      renderCell: (record) => <div className="font-normal">{record.createdBy}</div>,
    },
    {
      id: 'creationDate',
      header: 'Registration Date',
      width: { width: 150 },
      renderCell: (record) => <div className="font-normal">{record.creationDate}</div>,
    },
  ];
};

export default columns;
