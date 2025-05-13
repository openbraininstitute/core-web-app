import { CircuitSchemaProps } from '../type';
import CircuitData from './header/CircuitData';
import Heading from './header/Heading';

export default function HeaderDetailView({ content }: { content: CircuitSchemaProps }) {
  return (
    <header className="flex w-full flex-col gap-y-16">
      <Heading content={content} />
      <CircuitData content={content} />
    </header>
  );
}
