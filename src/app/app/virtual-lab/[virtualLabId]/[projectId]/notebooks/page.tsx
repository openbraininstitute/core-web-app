import { notFound } from 'next/navigation';
import { match, P } from 'ts-pattern';
import snakeCase from 'es-toolkit/compat/snakeCase';
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

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { BrowseLibraryScope } from '@/features/views/listing/browse-library';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';
import { WorkspaceScope, WorkspaceSection } from '@/constants';
import { KebabCase } from '@/utils/type';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import type { TWorkspaceScope } from '@/constants';

export default async function NotebooksPage({
  params: promisedParams,
}: ServerSideComponentProp<{ projectId: string; virtualLabId: string }, null>) {
  const params = promisedParams;
  const { projectId, virtualLabId } = await params;

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

  return (
    <BrowseEntityScope
      section={WorkspaceSection.Notebooks}
      dataType={ExtendedEntitiesTypeDict.Notebook}
      scope={WorkspaceScope.Public}
      requireBrainRegion={false}
      requireMiniDetailView={false}
    />
  );
}
