import Link from "next/link";
import { CircuitColumn, CircuitSchemaProps } from "../../../type";

import truncate from "@/util/truncate";

const columns: CircuitColumn[] = [
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
      ];

export default columns;