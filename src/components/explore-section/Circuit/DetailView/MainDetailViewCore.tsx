import { CircuitSchemaProps } from '../type';
import HeaderDetailView from './HeaderDetailView';
import SectionMainContainer from './sections/SectionMainContainer';
import Visualiser from './visualisation/Visualiser';

export default function MainDetailViewCore({
  content,
  parentCircuit,
  derivedCircuits,
}: {
  content: CircuitSchemaProps;
  parentCircuit: CircuitSchemaProps | null;
  derivedCircuits: CircuitSchemaProps[] | null;
}) {
  return (
    <div className="relative flex w-full flex-col text-primary-9">
      <HeaderDetailView content={content} />
      <Visualiser content={content} />
      <SectionMainContainer
        content={content}
        parentCircuit={parentCircuit}
        derivedCircuits={derivedCircuits}
      />
    </div>
  );
}
