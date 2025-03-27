import { SingleCircuitListView } from '../../type';
import HeaderButtonActionsBlock from './HeaderButtonActionsBlock';

import HeaderNameAndRevision from './HeaderNameAndRevision';

export default function HeaderCircuitDetailViewFirstRow({
  content,
}: {
  content: SingleCircuitListView;
}) {
  return (
    <div className="relative  flex w-full flex-row items-end justify-between">
      <HeaderNameAndRevision content={content} />
      <HeaderButtonActionsBlock content={content} />
    </div>
  );
}
