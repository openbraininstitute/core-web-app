import PlotInChat from '@/components/ai-assistant/message-item/storage-plots/plot-in-chat';

import PlotErrorMessage from '../plot-error-message';
import TruncableImage from '../truncable-image';

const StorageImage = ({
  src,
  validStorageIds,
}: {
  src?: string | Blob;
  validStorageIds?: string[];
}) => {
  const srcString = typeof src === 'string' ? src : undefined;
  if (!srcString) {
    return <PlotErrorMessage />;
  }

  const storageIdMatch = srcString.match(
    /\/storage\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
  );
  const isValidUUID = storageIdMatch && validStorageIds?.includes(storageIdMatch[1]);

  if (isValidUUID) {
    return <PlotInChat storageId={storageIdMatch[1]} />;
  }

  const isSameOrigin = srcString.includes('openbraininstitute');
  return isSameOrigin ? <PlotErrorMessage /> : <TruncableImage src={srcString} />;
};

export default StorageImage;
