import { RiFileList3Line } from '@remixicon/react';

import { Button } from '@/ui/molecules/button';

interface IImportHeaderTitleSectionProps {
  title: string | null;
  onDownloadGuideTemplate: () => void;
}

export function ImportHeaderTitleSection({
  title,
  onDownloadGuideTemplate,
}: IImportHeaderTitleSectionProps) {
  return (
    <div className="max-w-3xl flex items-center gap-3">
      <h2 className="text-2xl font-bold text-primary-9">{title}</h2>
      <Button
        rounded
        type="button"
        variant="outline"
        size="sm"
        onClick={onDownloadGuideTemplate}
        className="hover:bg-primary-9 hover:text-white"
      >
        <span>Guide</span>
        <RiFileList3Line />
      </Button>
    </div>
  );
}
