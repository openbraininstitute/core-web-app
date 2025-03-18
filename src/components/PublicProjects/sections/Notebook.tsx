import SingleNotebook from '../SingleNotebook';
import { NotebooksProps, ShowCaseProjectQueryType } from '../type';

export default function NotebookSection({ content }: { content: ShowCaseProjectQueryType }) {
  return (
    <div className="relative flex w-2/3 flex-col gap-y-12">
      {content.notebook !== null ? (
        content.notebook.map((notebook: NotebooksProps) => (
          <SingleNotebook key={`Notebook-${notebook.name}`} content={notebook} />
        ))
      ) : (
        <div className="text-2xl font-semibold text-neutral-4">No Notebooks available</div>
      )}
    </div>
  );
}
