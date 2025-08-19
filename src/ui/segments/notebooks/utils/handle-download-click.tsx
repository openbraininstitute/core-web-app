import { Notebook } from '@/util/virtual-lab/types';
import saveAs from 'file-saver';

const handleDownloadClick = async ({
  notebook,
  setLoadingZip,
  downloadZippedNotebook,
  notification,
}: {
  notebook: Notebook;
  setLoadingZip: (loading: boolean) => void;
  downloadZippedNotebook: (notebook: Notebook) => Promise<ArrayBuffer>;
  notification: {
    error: (options: { message: string; placement: string }) => void;
  };
}) => {
  setLoadingZip(true);

  try {
    const buffer = await downloadZippedNotebook(notebook);
    // The buffer is already an ArrayBuffer, so just use it directly
    const arrayBuffer = buffer;
    const blob = new Blob([arrayBuffer], { type: 'application/zip' });
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

export default handleDownloadClick;
