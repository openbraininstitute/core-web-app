'use client';

import { CircuitSchemaProps } from '../../../type';
import SubtitleBar from '../global/SubtitleBar';
import DerivedCircuits from './DerivedCircuit';
import ParentCircuit from './Parentcircuit';
import Subcircuits from './Subcircuit';

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
