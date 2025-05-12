import { CloseIcon } from "@/components/icons";

export default function HeaderDownloadModal({
    setIsDownloadModalOpen,
}: {
    setIsDownloadModalOpen: (isOpen: boolean) => void;
}) {
    return (
        <header className="w-full flex flex-row justify-between mb-8">
            <div className="font-bold text-white text-lg">Download Files</div>
            <button
                type="button"
                aria-label="Close download modal"
                className="text-white text-lg"
                onClick={() => setIsDownloadModalOpen(false)}
                >
                    <CloseIcon iconColor="white" className="h-4 w-4" />
                </button>
        </header>
    );
}
