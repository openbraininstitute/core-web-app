import PlotErrorMessage from '@/features/ai-assistant/message-item/plots/plot-error-message';
import PlotInChat from '@/features/ai-assistant/message-item/plots/plot-in-chat';

import TruncableImage from '../truncable-image';

const StorageImage = ({
  src,
  validStorageIds,
  isStreaming,
}: {
  src?: string | Blob;
  validStorageIds?: string[];
  isStreaming?: boolean;
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
  return isSameOrigin ? (
    <PlotErrorMessage />
  ) : (
    <TruncableImage src={srcString} isStreaming={isStreaming} />
  );
};

export default StorageImage;
