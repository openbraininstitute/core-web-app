import SingleNotebook from '@/ui/segments/reports/obi-showcases/notebooks/single-notebook';
import {
  NotebooksProps,
  ShowCaseProjectQueryType,
} from '@/ui/segments/reports/obi-showcases/showcase-type';

export default function NotebookSection({ content }: { content: ShowCaseProjectQueryType }) {
  return (
    <div className="relative flex w-full flex-col gap-y-16">
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
