import Link from "next/link";

import { CircuitColumn, CircuitSchemaProps } from "../type";

import { classNames } from "@/util/utils";

import { ChevronRight } from "@/components/icons";
import truncate from "@/util/truncate";

const columns = (
  expandedRowKeys: string | string[], 
  calculateSubcircuitsForParent: (arg0: CircuitSchemaProps) => any,
  handleExpandRow: (arg0: CircuitSchemaProps, arg1: number) => void): CircuitColumn[] => {
  
  return [
    {
      title: 'Name',
      key: 'name',
      render: (value: CircuitSchemaProps) => (
        <Link href={`./circuit/${value.key}`} className="whitespace-nowrap">{value.name}</Link>
      ),
    },
    {
      title: 'Description',
      key: 'description',
      render: (value: CircuitSchemaProps) => (
        <Link href={`./circuit/${value.key}`} className="whitespace-nowrap font-normal">{truncate(value.description, 40)}</Link>
      ),
      width: 300,
    },
    {
      title: 'Brain region',
      key: 'brainRegion',
      render: (value: CircuitSchemaProps) => (
        <Link href={`./circuit/${value.key}`} className="whitespace-nowrap font-normal">{value.brainRegion}</Link>
      ),
    },
    {
      title: '# Neurons',
      key: 'numberOfNeurons',
      render: (value: CircuitSchemaProps) => (
        <Link href={`./circuit/${value.key}`} className="whitespace-nowrap font-normal">{value.numberOfNeurons}</Link>
      ),
    },
    {
      title: 'Species',
      key: 'specie',
      render: (value: CircuitSchemaProps) => (
        <Link href={`./circuit/${value.key}`} className="whitespace-nowrap font-normal">{value.species}</Link>
      ),
    },
    {
      title: 'Contributor',
      key: 'contributorSimple',
      render: (value: CircuitSchemaProps) => (
        <Link href={`./circuit/${value.key}`} className="whitespace-nowrap font-normal">{value.metadata.contributorSimple}</Link>
      ),
    },
    {
      title: 'Registration date',
      key: 'registrationDate',
      render: (value: CircuitSchemaProps) => (
        <Link href={`./circuit/${value.key}`} className="whitespace-nowrap font-normal">{value.metadata.registrationDate}</Link>
      ),
    },
    {
      title: 'Subcircuits',
      key: 'hasSubcircuits',
      render: (value: CircuitSchemaProps, index?: number) => {
        const isExpanded = expandedRowKeys.includes(value.key);
        const totalSubcircuitsForParent = calculateSubcircuitsForParent(value);

        return (
          value.hasSubcircuits && (
            <button
              type="button"
              className="relative flex h-6 items-center justify-center text-base font-normal focus:outline-none"
              aria-label="Open subcircuit"
              onClick={() => handleExpandRow(value, index ?? -1)}
              disabled={!value.hasSubcircuits}
            >
              <div className="relative mr-6 block">{totalSubcircuitsForParent}</div>
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

}

export default columns;
