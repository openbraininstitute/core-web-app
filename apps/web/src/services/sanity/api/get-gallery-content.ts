import { getClient } from '@/services/sanity/client';
import galleryQuery from '@/services/sanity/queries/gallery';
import { logError } from '@/utils/logger';

export type GalleryContentProps = {
  title: string;
  description: string | null;
  mediaType: string;
  image: string | null;
  video: string | null;
  brainRegion: string | null;
  has_background: boolean;
  backgroundColor: string | null;
};

function isContentForGallery(data: unknown): data is GalleryContentProps {
  try {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
    const item = data as Record<string, unknown>;

    if (Object.keys(item).length === 0) return false;

    return (
      typeof item.title === 'string' &&
      (typeof item.description === 'string' || item.description === null) &&
      typeof item.mediaType === 'string' &&
      (typeof item.image === 'string' || item.image === null) &&
      (typeof item.video === 'string' || item.video === null) &&
      (typeof item.brainRegion === 'string' || item.brainRegion === null)
    );
  } catch (ex) {
    logError(ex);
    return false;
  }
}

export async function getGalleryContent(): Promise<GalleryContentProps[]> {
  try {
    const data = await getClient().fetch<GalleryContentProps[]>(galleryQuery);

    if (Array.isArray(data)) {
      return data.filter(isContentForGallery);
    }
  } catch (err) {
    logError('Error fetching gallery content:', err);
  }

  return [];
}
