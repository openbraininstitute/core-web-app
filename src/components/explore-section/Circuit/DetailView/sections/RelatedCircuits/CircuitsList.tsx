'use client';

import CircuitTable from '../../../global/CircuitTable';
import { CircuitSchemaProps } from '../../../type';

export default function CircuitsList({
  content,
  type
}:{
  content: CircuitSchemaProps[],
  type: 'derived' | 'subcircuit' | 'parent'
}) {
  

  return (
    <div className="relative flex w-full flex-col">
      <CircuitTable
        data={parentCircuitData ? [parentCircuitData] : []}
        hasSearch={false}
        downloadable={false}
      />
    </div>
  );
}
