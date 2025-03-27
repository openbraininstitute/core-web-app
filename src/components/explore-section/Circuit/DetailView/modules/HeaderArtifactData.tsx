import { SingleCircuitListView } from '../../content/CIRCUITS_PLACEHOLDER';
import TitleAndPropertyBloc from './blocs/TitleAndPropertyBloc';

export default function HeaderArtifactData({ content }: { content: SingleCircuitListView }) {
  return (
    <div className="relative grid grid-cols-3">
      <div className="relative flex w-full flex-col gap-y-4">
        <TitleAndPropertyBloc title="Brain region" content={content.brainRegion} />
        {content.provenance.subcircuitOf && (
          <TitleAndPropertyBloc title="Subcircuit of" content={content.provenance.subcircuitOf} />
        )}
        {content.metadata.license !== null && (
          <TitleAndPropertyBloc title="License" content={content.metadata.license?.name} />
        )}
      </div>
      <div className="relative flex w-full flex-col gap-y-4">
        <TitleAndPropertyBloc title="Number of neurons" content={content.numberOfNeurons} />
        <TitleAndPropertyBloc title="Number of connections" content={content.numberOfConnections} />
        <TitleAndPropertyBloc title="Number of synapses" content={content.numberOfSynapses} />
      </div>
    </div>
  );
}
