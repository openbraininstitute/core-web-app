import BookmarkTabs from '@/components/VirtualLab/Bookmarks/BookmarkTabs';
import { ServerSideComponentProp } from '@/types/common';

export default async function VirtualLabProjectLibraryPage(
  props: ServerSideComponentProp<{ virtualLabId: string; projectId: string }>
) {
  const params = await props.params;
  const { virtualLabId, projectId } = params;

  return <BookmarkTabs labId={virtualLabId} projectId={projectId} />;
}
