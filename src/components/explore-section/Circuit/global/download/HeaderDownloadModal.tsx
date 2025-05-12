import { CloseIcon } from '@/components/icons';

export default function HeaderDownloadModal({
  handleCloseDownloadModal,
}: {
  handleCloseDownloadModal: () => void;
}) {
  return (
    <header className="mb-8 flex w-full flex-row justify-between">
      <div className="text-base font-bold text-primary-4">Download Files</div>
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
