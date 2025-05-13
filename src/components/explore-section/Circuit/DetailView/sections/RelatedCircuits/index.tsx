'use client';

import CircuitTable from '../../../global/CircuitTable';
import { CircuitSchemaProps } from '../../../type';
import SubtitleBar from '../global/SubtitleBar';

export default function RelatedCircuitsSection({
  content,
  parentCircuit,
  derivedCircuits,
}: {
  content: CircuitSchemaProps;
  parentCircuit: CircuitSchemaProps | null;
  derivedCircuits: CircuitSchemaProps[] | null;
}) {
  return (
    <div className="relative flex w-full flex-col">
      {content.parent !== null && (
        <>
          <SubtitleBar title="Parent circuit" />
          <CircuitTable data={parentCircuit ? [parentCircuit] : []} />
        </>
      )}
      {content.subcircuits.length > 0 && (
        <>
          <SubtitleBar title={content.subcircuits.length > 1 ? 'Subcircuits' : 'Subcircuit'} />
          <CircuitTable data={content.subcircuits} />
        </>
      )}
      {(derivedCircuits && derivedCircuits.length > 0) ||
        (derivedCircuits === null && (
          <>
            <SubtitleBar title="Derived from" />
            <CircuitTable data={derivedCircuits || []} />
          </>
        ))}
    </div>
  );
}
