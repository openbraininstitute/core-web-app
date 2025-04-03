import { CircuitSchemaProps } from '../../type';
import CircuitMetadata from './CircuitMetadata';
import CircuitParameters from './CircuitParameters';

export default function CircuitData({ content }: { content: CircuitSchemaProps }) {
  return (
    <div className="relative flex w-full flex-row">
      <CircuitMetadata content={content} />
      <CircuitParameters content={content} />
    </div>
  );
}
