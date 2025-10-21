import { downloadAsset } from '@/api/entitycore/queries/assets';
import authFetch from '@/authFetch';
// import { useAppNotification } from '@/components/notification';
import { notebookRepoUrl } from '@/config';
import { ServerSideComponentProp } from '@/types/common';
import { NotebookTable } from '@/ui/segments/notebooks/table';
import { useAppNotification } from '@/components/notification';
import { Notebook } from '@/util/virtual-lab/types';
import { startNotebook, NotebookStartResponse } from '@/services/notebooks';
// import fetchNotebooks from '@/util/virtual-lab/fetchNotebooks';

export default async function NotebooksPage({
  params: promisedParams,
}: ServerSideComponentProp<{ projectId: string; virtualLabId: string }, null>) {
  const params = promisedParams;
  const { projectId, virtualLabId } = await params;

  // const notification = useAppNotification();

  function fetchNotebooks() {
    return authFetch(
      'https://staging.openbraininstitute.org/api/entitycore/analysis-notebook-template',
      {
        headers: {
          'virtual-lab-id': virtualLabId,
          'project-id': projectId,
        },
      }
    );
  }

  const notebooks = await fetchNotebooks();
  const json = await notebooks.json();
  console.log(json)

  const notebook = json.data[0];
  // const asset = notebook.assets.find((n) => n.label === 'jupyter_notebook');

  // const file = await downloadAsset({
  //   ctx: { virtualLabId, projectId },
  //   entityType: 'analysis_notebook_template',
  //   entityId: notebook.id,
  //   id: asset.id,
  //   asRawResponse: true,
  // });

  // const file_json = await file.json();

  // const runOnEksNotebook = async () => {
  //   try {
  //     const retval: NotebookStartResponse = await startNotebook(
  //       '827eb08e-12ab-4e00-bada-1ae537a13739',
  //       'display_circuit_composition.ipynb',
  //       virtualLabId,
  //       projectId
  //     );
  //     notification.success({
  //       message: `Notebook starting`,
  //       key: 'notebook-started-successfully',
  //       placement: 'topRight',
  //     });
  //     window.open(retval.url, '_blank');
  //   } catch (error) {
  //     // Just show the hint message if we get some error
  //     if (error instanceof Error && 'cause' in error) {
  //       notification.error({
  //         message: (error.cause as { error_code: string; hint: string }).hint,
  //         key: 'notebook-error',
  //         placement: 'topRight',
  //       });
  //     } else {
  //       notification.error({
  //         message: `Failed to start notebook, unknown error: ${error}`,
  //         key: 'notebook-unknown-error',
  //         placement: 'topRight',
  //       });
  //     }
  //   }
  // };

  // return <button onClick={runOnEksNotebook}>Run notebook</button>;
  // return (
  //   <div className="w-full">
  //     <NotebookTable
  //       notebooks={notebooks}
  //       projectId={projectId}
  //       vlabId={virtualLabId}
  //       serverError={error}
  //     />
  //   </div>
  // );

  return null;
}
