import { getGalleryContent } from '@/api/sanity/gallery/route';
import GalleryPage from '@/ui/segments/gallery';

export const revalidate = 3600;
export const dynamicParams = true;

export default async function Page() {
  const galleryContent = await getGalleryContent();
  return <GalleryPage galleryContent={galleryContent} />;
}
