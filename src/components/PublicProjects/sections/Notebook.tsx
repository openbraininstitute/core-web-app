import SingleNotebook from '../SingleNotebook';
import { NotebooksProps, ShowCaseProjectQueryType } from '../type';

export default function NotebookSection({ content }: { content: ShowCaseProjectQueryType }) {
  return (
    <div className="relative flex w-2/3 flex-col gap-y-16">
      {content.notebook !== null ? (
        content.notebook.map((notebook: NotebooksProps, index: number) => (
          <SingleNotebook key={`Notebook-${notebook.name}`} content={notebook} index={index} />
        ))
      ) : (
        <div className="text-neutral-4 text-2xl font-semibold">No Notebooks available</div>
      )}
    </div>
  );
}
