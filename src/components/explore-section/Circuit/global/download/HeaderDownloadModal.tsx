import { DownloadItemProps } from '../../type';
import { calculateTotalDownloadableItems } from '../../utils/calculate-total-downloadable-items';

import { CloseIcon } from '@/components/icons';

export default function HeaderDownloadModal({
  handleCloseDownloadModal,
  content,
}: {
  handleCloseDownloadModal: () => void;
  content: DownloadItemProps[];
}) {
  return (
    <header className="mb-8 flex w-full flex-row justify-between">
      <div className="flex flex-row gap-x-2 text-base text-primary-4">
        <div className="font-bold">Download Files</div>
        <div className="font-light">Total files: {calculateTotalDownloadableItems(content)}</div>
      </div>
      <button
        type="button"
        aria-label="Close download modal"
        className="text-lg text-white"
        onClick={() => handleCloseDownloadModal()}
      >
        <CloseIcon iconColor="white" className="h-4 w-4" />
      </button>
    </header>
  );
}
