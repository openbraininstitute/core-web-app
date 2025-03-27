import { CircuitSchemaProps } from '../type';

import { ChevronRight } from '@/components/icons';
import { classNames } from '@/util/utils';

const columns = ({
  handleExpandRow,
  expandedRowKeys,
}: {
  handleExpandRow: (row: CircuitSchemaProps, index: number) => void;
  expandedRowKeys: string[];
}) => {
  return [
    {
      title: 'Name',
      key: 'name',
      render: (value: CircuitSchemaProps) => (
        <span className="whitespace-nowrap">{value.name}</span>
      ),
    },
    {
      title: 'Description',
      key: 'description',
      render: (value: CircuitSchemaProps) => (
        <span className="whitespace-nowrap font-normal">{value.description}</span>
      ),
    },
    {
      title: 'Brain region',
      key: 'brainRegion',
      render: (value: CircuitSchemaProps) => (
        <span className="whitespace-nowrap font-normal">{value.brainRegion}</span>
      ),
    },
    {
      title: '# Neurons',
      key: 'numberOfNeurons',
      render: (value: CircuitSchemaProps) => (
        <span className="whitespace-nowrap font-normal">{value.numberOfNeurons}</span>
      ),
    },
    {
      title: 'Species',
      key: 'specie',
      render: (value: CircuitSchemaProps) => (
        <span className="whitespace-nowrap font-normal">{value.specie}</span>
      ),
    },
    {
      title: 'Created by',
      key: 'createdBy',
      render: (value: CircuitSchemaProps) => (
        <span className="whitespace-nowrap font-normal">{value.metadata.createdBy}</span>
      ),
    },
    {
      title: 'Creation date',
      key: 'creationDate',
      render: (value: CircuitSchemaProps) => (
        <span className="whitespace-nowrap font-normal">{value.metadata.creationDate}</span>
      ),
    },
    {
      title: 'Subcircuits',
      key: 'hasSubcircuits',
      render: (value: CircuitSchemaProps, index?: number) => {
        const isExpanded = expandedRowKeys.includes(value.key);

        return (
          value.hasSubcircuits && (
            <button
              type="button"
              className="relative flex h-6 items-center justify-center text-base font-normal"
              aria-label="Open subcircuit"
              onClick={() => handleExpandRow(value, index ?? -1)}
              disabled={!value.hasSubcircuits}
            >
              <div className="relative mr-6 block ">{value.subcircuits?.length}</div>
              <ChevronRight
                fill="#003A8C"
                className={classNames(
                  'relative top-px h-4 w-auto transition-transform duration-300 ease-in-out',
                  isExpanded ? 'rotate-90' : 'rotate-0'
                )}
              />
            </button>
          )
        );
      },
    },
  ];
};

export default columns;
