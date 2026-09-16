import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { isDirectoryAsset } from '@/features/scan-config/components/file-viewer/directory-entries';
import { classNames } from '@/util/utils';

import type { ReactNode } from 'react';
import type { TActivityCustomFile } from '@/features/scan-config/types';

function splitName(name: string | undefined): { head: string; tail: string } {
  const MAX_TAIL = 12;
  if (!name || name.length <= MAX_TAIL * 2) return { head: name ?? '', tail: '' };

  const boundary = Math.max(name.lastIndexOf('_'), name.lastIndexOf('-'), name.lastIndexOf('.'));
  const cut = boundary > name.length - MAX_TAIL ? boundary : name.length - MAX_TAIL;

  return { head: name.slice(0, cut), tail: name.slice(cut) };
}

type Props = {
  id?: string;
  name?: string;
  file: TActivityCustomFile;
  selected?: boolean;
  label?: ReactNode;
  onSelect: (file: TActivityCustomFile) => void;
};

export function TaskIOFileItem({ id, name, file, selected, label, onSelect }: Props) {
  const fileName = file.assetPath?.split('/').at(-1) ?? file.asset.path.split('/').at(-1);
  const isDirectory = isDirectoryAsset(file.asset);
  const isCircuitDirectory = isDirectory && file.asset.label === AssetLabel.sonata_circuit;
  const displayName = name ?? (isCircuitDirectory ? 'Circuit directory' : fileName);
  // a directory asset has no extension to fall back on, and "figures" is not a format
  const badgeContent = label ?? (isDirectory ? 'folder' : fileName?.split('.').at(-1));
  const { head, tail } = splitName(displayName);

  return (
    <button
      id={id}
      data-testid={`task-io-file-item-${id}`}
      data-file-name={displayName}
      type="button"
      title={displayName}
      className={classNames(
        'group flex w-full cursor-pointer flex-nowrap items-center justify-between gap-x-4 rounded-4xl p-4',
        'shadow-[0_1px_2px_rgba(16,24,40,0.06)]',
        selected ? 'bg-[linear-gradient(95.07deg,#003A8C_42.23%,#001026_109.71%)]' : 'bg-white',
        'hover:bg-gray-100'
      )}
      onClick={() => onSelect(file)}
    >
      <div
        className={classNames(
          'flex min-w-36 flex-1 basis-0 items-baseline overflow-hidden font-semibold whitespace-nowrap text-left',
          selected ? 'text-white' : 'text-primary-9'
        )}
      >
        <span className="min-w-0 truncate">{head}</span>
        {tail && <span className="shrink-0">{tail}</span>}
      </div>
      <span
        className={classNames(
          'group-hover:bg-gray-200 group-hover:border-gray-100',
          'min-w-0 max-w-[48%] truncate rounded-full border border-gray-200 px-4 uppercase text-xs py-1',
          'transition-[max-width] duration-200 ease-[cubic-bezier(0.2,0,0,1)] hover:max-w-[88%]',
          selected ? 'border-white text-primary-9 bg-white' : 'text-neutral-5'
        )}
      >
        {badgeContent}
      </span>
    </button>
  );
}
