import { CircuitSchemaProps } from '../../type';
import HeaderButtonActionsBlock from './HeaderButtonActionsBlock';

import HeaderNameAndRevision from './HeaderNameAndRevision';

export default function HeaderCircuitDetailViewFirstRow({
  content,
}: {
  content: CircuitSchemaProps;
}) {
  return (
    <div className="relative  flex w-full flex-row items-end justify-between">
      <HeaderNameAndRevision content={content} />
      <HeaderButtonActionsBlock content={content} />
    </div>
  );
}
