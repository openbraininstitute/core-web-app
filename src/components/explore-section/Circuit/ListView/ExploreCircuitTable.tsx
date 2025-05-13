'use client';

import CircuitTable from '../global/circuit-table';
import { CircuitSchemaProps } from '../type';

export default function ExploreCircuitTable({ data }: { data: CircuitSchemaProps[] }) {
  return (
    <div className="relative flex w-full flex-col bg-white pt-10">
      <CircuitTable data={data} />
    </div>
  );
}
