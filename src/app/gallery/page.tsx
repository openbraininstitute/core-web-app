import { getGalleryContent } from '@/api/sanity/gallery/route';
import GalleryPage from '@/ui/segments/gallery';

export default async function Page() {
  const galleryContent = await getGalleryContent();
  return <GalleryPage galleryContent={galleryContent} />;
}
