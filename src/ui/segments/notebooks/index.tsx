import NotebookTable from '@/ui/segments/notebooks/table';
import { Notebook } from '@/util/virtual-lab/types';
import NotebookNavigation from './navigation';

export default function NotebookMain({
  notebooks,
  failed,
  onDelete,
  vlabId,
  projectId,
  serverError,
}: {
  vlabId: string;
  projectId: string;
  notebooks: Notebook[];
  failed?: string[];
  onDelete?: (id: string) => void;
  serverError?: string;
}) {
  return (
    <>
      <NotebookNavigation />
      <div className="col-span-4 rounded-xl border border-solid border-gray-200 p-3">
        <NotebookTable
          notebooks={notebooks}
          failed={failed}
          onDelete={onDelete}
          vlabId={vlabId}
          projectId={projectId}
          serverError={serverError}
        />
      </div>
    </>
  );
}
