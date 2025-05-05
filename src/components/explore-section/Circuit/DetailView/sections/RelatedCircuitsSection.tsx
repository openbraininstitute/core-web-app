'use client';

import { CircuitSchemaProps } from '../../type';
import DerivedCircuits from './RelatedCircuits/DerivedCircuit';
import ParentCircuit from './RelatedCircuits/ParentCircuit';
import Subcircuits from './RelatedCircuits/Subcircuit';
import SubtitleBar from './SubtitleBar';

export default function RelatedCircuitsSection({ content }: { content: CircuitSchemaProps }) {
  return (
    <div className="relative flex w-full flex-col">
      {content.parent !== null && (
        <>
          <SubtitleBar title="Parent circuit" />
          <ParentCircuit content={content} />
        </>
      )}
      {content.subcircuits.length > 0 && (
        <>
          <SubtitleBar title={content.subcircuits.length > 1 ? 'Subcircuits' : 'Subcircuit'} />
          <Subcircuits content={content} />
        </>
      )}
      {content.derivedFrom.length > 0 ||
        (content.derivedFrom === null && (
          <>
            <SubtitleBar title="Derived from" />
            <DerivedCircuits content={content} />
          </>
        ))}
    </div>
  );
}