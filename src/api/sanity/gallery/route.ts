import { client } from '@/api/sanity/client';
import { logError } from '@/util/logger';

export type GalleryContentProps = {
  title: string;
  description: string | null;
  mediaType: string;
  image: string | null;
  video: string | null;
};

const queryForGalleryContent = `*[_type == "gallery"] {
  title,
  description,
  mediaType,
  "image": image.asset->url,
  video
}`;

function isContentForGallery(data: unknown): data is GalleryContentProps {
  try {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
    const item = data as Record<string, unknown>;

    // Check if it's an empty object
    if (Object.keys(item).length === 0) return false;

    return (
      typeof item.title === 'string' &&
      (typeof item.description === 'string' || item.description === null) &&
      typeof item.mediaType === 'string' &&
      (typeof item.image === 'string' || item.image === null) &&
      (typeof item.video === 'string' || item.video === null)
    );
  } catch (ex) {
    logError(ex);
    return false;
  }
}

export async function getGalleryContent(): Promise<GalleryContentProps[]> {
  try {
    const data = await client.fetch<GalleryContentProps[]>({
      query: queryForGalleryContent,
    });

    logError('Raw gallery data:', data);
    logError('Is array?', Array.isArray(data));
    logError('Array length:', Array.isArray(data) ? data.length : 'not an array');

    if (Array.isArray(data)) {
      const filtered = data.filter((item) => {
        const isValid = isContentForGallery(item);
        if (!isValid) {
          logError('Invalid gallery item:', item);
        }
        return isValid;
      });
      logError('Filtered gallery items:', filtered.length);
      return filtered;
    }
  } catch (err) {
    logError('Error fetching gallery content:', err);
  }

  return [];
}
