import { DownloadItemProps } from '../type';

export function calculateTotalDownloadableItems(files: DownloadItemProps[]): number {
  return files.reduce((total, file) => total + (file.children?.length ?? 0), 0);
}
