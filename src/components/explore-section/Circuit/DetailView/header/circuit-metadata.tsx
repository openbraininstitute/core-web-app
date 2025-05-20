import { CircuitSchemaProps } from '../../type';
import ParameterBox from '../global/ParameterBox';

export default function CircuitMetadata({ content }: { content: CircuitSchemaProps }) {
  return (
    <div className="relative mr-24 flex w-[480px] flex-col gap-y-4">
      <div>
        <ParameterBox name="Description" value={content.description} />
      </div>
      <div>
        <ParameterBox
          name="Contributors"
          value={content.metadata.contributors || '–'}
          hasViewMore
        />
      </div>
      <div>
        <ParameterBox
          name="Contributing institutions"
          value={content.metadata.contributingInstitution || '–'}
          hasViewMore
        />
      </div>
    </div>
  );
}
