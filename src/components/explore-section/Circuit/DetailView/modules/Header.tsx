import { SingleCircuitListView } from '../../type';
import HeaderCircuitDetailViewSecondRow from './HeaderCircuitDetailViewSecondRow';
import HeaderCircuitDetailViewFirstRow from './HeaderFirstRow';

export default function HeaderCircuitDetailView({ content }: { content: SingleCircuitListView }) {
  return (
    <header className="relative mb-16 w-full flex-col gap-4">
      <HeaderCircuitDetailViewFirstRow content={content} />
      <HeaderCircuitDetailViewSecondRow content={content} />
    </header>
  );
}
