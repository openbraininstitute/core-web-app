import { CircuitSchemaProps } from '../../../type';
import SubtitleBar from '../SubtitleBar';
import DerivedCircuits from './DerivedCircuit';
import ParentCircuit from './ParentCircuit';
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
      {content.subcircuit.length > 0 && (
        <>
          <SubtitleBar title={content.subcircuit.length > 1 ? 'Subcircuits' : 'Subcircuit'} />
          <Subcircuits content={content} />
        </>
      )}
      {content.derivedFrom.length > 0 && (
        <>
          <SubtitleBar title="Derived from" />
          <DerivedCircuits content={content} />
        </>
      )}
    </div>
  );
}
