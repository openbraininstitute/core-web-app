'use client';

import CircuitTable from '../global/CircuitTable';
import { CircuitSchemaProps } from '../type';

export default function ExploreCircuitTable({ data }: { data: CircuitSchemaProps[] }) {
  return (
    <div className="relative flex w-full flex-col pt-10">
      <CircuitTable data={data} />
    </div>
  );
}
