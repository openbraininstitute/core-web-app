import PlotInChat from '@/components/ai-assistant/message-item/backup-plots/tools/plot-in-chat';

import PlotErrorMessage from '../plot-error-message';
import TruncableImage from '../truncable-image';

const StorageImage = ({ src, alt }: { src?: string | Blob; alt?: string }) => {
  const srcString = typeof src === 'string' ? src : undefined;
  if (!srcString) {
    return <div className="ml-20 text-red-500">Error: No image source provided</div>;
  }

  let isSameOrigin = false;
  try {
    isSameOrigin = new URL(srcString).origin === window.location.origin;
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
