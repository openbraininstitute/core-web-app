import { CheckCircleFilled } from '@ant-design/icons';

import { CopyDocumentFill, LinkFill } from '@/components/icons/EditorIcons';
import { useCopyToClipboard } from '@/hooks/useCopyClipboard';

interface Props {
  doi?: string | null;
  url?: string | null;
  className?: string;
}

export function Actions({ doi, url, className }: Props) {
  const [, copy, , copying] = useCopyToClipboard();
  return (
    <div className={`flex flex-shrink-0 items-center gap-1 ${className || ''}`}>
      {url && (
        <button
          type="button"
          onClick={() => window.open(url, '_blank')}
          className="flex h-8 items-center justify-center gap-2 px-2"
        >
          <LinkFill className="text-primary-8 mr-1" />
          Link
        </button>
      )}
      {doi && (
        <button
          type="button"
          onClick={() => copy(doi)}
          className="text-primary-8 flex h-8 w-[100px] items-center justify-center gap-2 px-2"
        >
          {copying ? (
            <>
              <CheckCircleFilled className="text-accent-dark mr-1" />
              Copied
            </>
          ) : (
            <>
              <CopyDocumentFill className="text-primary-8 mr-1" />
              Copy DOI
            </>
          )}
        </button>
      )}
    </div>
  );
}
