import { saveAs } from 'file-saver';
import { useMemo, useState } from 'react';

import { useAppNotification } from '@/components/notification';
import useSearch from '@/components/VirtualLab/Search';
import { env } from '@/env';
import { downloadZippedNotebook } from '@/util/virtual-lab/github';
import { Notebook } from '@/util/virtual-lab/types';
import { startNotebook, NotebookStartResponse } from '@/services/notebooks';
import { useWorkspace } from '@/ui/hooks/use-workspace';

export function useNotebookTable(notebooks: Notebook[], failed?: string[], serverError?: string) {
  const notification = useAppNotification();
  const { virtualLabId, projectId } = useWorkspace();
  const [loadingZip, setLoadingZip] = useState(false);
  const [currentNotebook, setCurrentNotebook] = useState<Notebook | null>(null);
  const [display, setDisplay] = useState<'notebook' | 'readme' | null>(null);

  const { search, Search } = useSearch({
    placeholder: 'Search for notebooks',
    containerClassName: 'ml-5',
    className: 'w-[200px]',
  });

  // Show notifications for errors
  if (serverError) {
    notification.error({
      message: serverError,
      key: 'notebooks-server-error',
      placement: 'topRight',
    });
  }

  if (failed && failed.length) {
    notification.warning({
      message:
        "Failed to fetch some repositories, ensure they're public and contain valid metadata for each notebook",
      placement: 'topRight',
      key: 'failed-repo-warning',
    });
  }

  // Filter notebooks based on search
  const filteredNotebooks = useMemo(() => {
    if (!search) return notebooks;

    type StringKeys = {
      [K in keyof Notebook]: Notebook[K] extends string ? K : never;
    }[keyof Notebook];

    const searchFields: StringKeys[] = [
      'authors',
      'description',
      'notebookUrl',
      'name',
      'objectOfInterest',
      'scale',
    ];

    return notebooks.filter((n) => {
      for (const field of searchFields) {
        if (n[field].toLocaleLowerCase().includes(search.toLocaleLowerCase())) {
          return true;
        }
      }
      return false;
    });
  }, [notebooks, search]);

  // Reset modal state
  const resetModal = () => {
    setCurrentNotebook(null);
    setDisplay(null);
  };

  // Run notebook functionality
  const runNotebook = async (notebook: Notebook) => {
    const repo = `https://github.com/${notebook.githubUser}/${notebook.githubRepo}`;
    const urlpath = `lab/tree/${notebook.githubRepo}/${notebook.path}`;

    const environment = env.NEXT_PUBLIC_DEPLOYMENT_ENV;
    const subdomain = environment === 'production' ? 'www' : 'staging';

    // Metabolism notebook requires a separate jupyterhub instance
    const jupyterHubBasePath =
      notebook.name === 'Metabolism' ? 'jupyterhub_metabolism' : 'jupyterhub';

    const url = new URL(`https://${subdomain}.openbraininstitute.org`);
    url.pathname = `${jupyterHubBasePath}/hub/user-redirect/git-pull`;
    url.searchParams.append('repo', repo);
    url.searchParams.append('urlpath', urlpath);
    url.searchParams.append('branch', 'main');

    window.open(url, '_blank');
  };

  const runOnEksNotebook = async (notebook: Notebook) => {
    try {
      const retval: NotebookStartResponse = await startNotebook(notebook, virtualLabId, projectId);
      notification.success({
        message: `Notebook starting`,
        key: 'notebook-started-successfully',
        placement: 'topRight',
      });
      window.open(retval.url, '_blank');
    } catch (error) {
      // Just show the hint message if we get some error
      if (error instanceof Error && 'cause' in error) {
        notification.error({
          message: (error.cause as { error_code: string; hint: string }).hint,
          key: 'notebook-error',
          placement: 'topRight',
        });
      } else {
        notification.error({
          message: `Failed to start notebook, unknown error: ${error}`,
          key: 'notebook-unknown-error',
          placement: 'topRight',
        });
      }
    }
  };

  // Download notebook functionality
  const handleDownloadClick = async (notebook: Notebook) => {
    setLoadingZip(true);

    try {
      const buffer = await downloadZippedNotebook(notebook);
      const blob = new Blob([new Uint8Array(buffer)], { type: 'application/zip' });
      saveAs(blob, `${notebook.name}.zip`);
      setLoadingZip(false);
    } catch {
      notification.error({
        message: 'Failed to download the contents, ensure the repo is public',
        placement: 'bottomRight',
      });
      setLoadingZip(false);
    }
  };

  // Handle readme click
  const handleReadmeClick = (notebook: Notebook) => {
    setDisplay('readme');
    setCurrentNotebook(notebook);
  };

  return {
    loadingZip,
    currentNotebook,
    display,
    search,
    Search,
    filteredNotebooks,
    resetModal,
    runNotebook,
    handleDownloadClick,
    handleReadmeClick,
    runOnEksNotebook,
  };
}
