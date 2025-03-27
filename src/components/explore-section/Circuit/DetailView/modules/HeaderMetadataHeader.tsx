import { SingleCircuitListView } from '../../content/CIRCUITS_PLACEHOLDER';
import TitleAndPropertyBloc from './blocs/TitleAndPropertyBloc';

export default function HeaderMetadataHeader({ content }: { content: SingleCircuitListView }) {
  return (
    <div className="relative flex w-[480px] flex-col gap-y-4">
      <TitleAndPropertyBloc title="Description" content={content.description} />
      <div className="grid grid-cols-2">
        <TitleAndPropertyBloc title="Created by" content={content.metadata.createdBy} />
        <TitleAndPropertyBloc title="Creation date" content={content.metadata.creationDate} />
      </div>
    </div>
  );
}
