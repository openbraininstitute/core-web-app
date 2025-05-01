import { CircuitSchemaProps } from '../../type';
import ParameterBox from '../global/ParameterBox';

export default function CircuitParameters({ content }: { content: CircuitSchemaProps }) {
  return (
    <div className="relative grid grid-cols-3 gap-12">
      <div className="relative flex flex-col gap-y-4">
        <ParameterBox name="Brain Region" value={content.brainRegion} />
        <ParameterBox name="Subcircuit of" value={content.parent ?? '–'} />
        <ParameterBox name="License" value={content.metadata.license?.name ?? '–'} />
      </div>
      <div className="relative flex flex-col gap-y-4">
        <ParameterBox name="Number of neurons" value={content.numberOfNeurons} />
        <ParameterBox name="Number of connections" value={content.numberOfConnections} />
        <ParameterBox name="Number of synapses" value={content.numberOfSynapses} />
      </div>
    </div>
  );
}
