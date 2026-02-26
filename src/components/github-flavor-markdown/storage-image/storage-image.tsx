import PlotInChat from '@/components/ai-assistant/message-item/storage-plots/plot-in-chat';

import PlotErrorMessage from '../plot-error-message';
import TruncableImage from '../truncable-image';

const StorageImage = ({ src }: { src?: string | Blob }) => {
  const srcString = typeof src === 'string' ? src : undefined;
  if (!srcString) {
    return <PlotErrorMessage />;
  }

  let isSameOrigin = false;
  try {
    isSameOrigin = new URL(srcString).origin.includes('openbraininstitute');
  } catch {
    return <PlotErrorMessage />;
  }

  if (!isSameOrigin) {
    return <TruncableImage src={srcString} />;
  }

  const storageIdMatch = srcString.match(/\/storage\/([^/]+)/);
  const isValidUUID =
    storageIdMatch &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storageIdMatch[1]);

  if (!storageIdMatch || !isValidUUID) {
    return <PlotErrorMessage />;
  }

  return <PlotInChat storageId={storageIdMatch[1]} />;
};

export default StorageImage;
