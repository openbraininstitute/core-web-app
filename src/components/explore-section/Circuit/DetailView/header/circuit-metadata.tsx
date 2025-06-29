import { CircuitSchemaProps } from '../../type';
import ListParameterBox from '../global/ListParameterBox';
import ParameterBox from '../global/ParameterBox';

export default function CircuitMetadata({ content }: { content: CircuitSchemaProps }) {
  return (
    <div className="relative mr-24 flex w-[480px] flex-col gap-y-4">
      <div>
        <ParameterBox name="Description" value={content.description} />
      </div>
      <div>
        <ListParameterBox
          name="Contributors"
          value={content.metadata.contributors ?? []}
          slice={4}
        />
      </div>
      <div>
        <ListParameterBox
          name="Contributing institutions"
          value={content.metadata.organizations}
          slice={2}
        />
      </div>
      {content.contact && (
        <ParameterBox name="Contact" value={content.contact} link={`mailto:${content.contact}`} />
      )}
    </div>
  );
}
