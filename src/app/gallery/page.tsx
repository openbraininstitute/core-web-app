import { getGalleryContent } from '@/services/sanity/content/gallery';
import GalleryPage from '@/ui/segments/gallery';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const galleryContent = await getGalleryContent();
  return <GalleryPage galleryContent={galleryContent} />;
}
