import { CircuitSchemaProps } from '../../type';
import ParameterBox from '../global/ParameterBox';

export default function CircuitMetadata({ content }: { content: CircuitSchemaProps }) {
  return (
    <div className="relative mr-24 flex w-[480px] flex-col">
      <div>
        <ParameterBox name="Description" value={content.description} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <ParameterBox name="Created by" value={content.metadata.contributorSimple || '–'} />

        <ParameterBox name="Creation date" value={content.metadata.creationDate} />
      </div>
    </div>
  );
}
