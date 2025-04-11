import BookmarkTabs from '@/components/VirtualLab/Bookmarks/BookmarkTabs';
import { ServerSideComponentProp } from '@/types/common';

export default async function VirtualLabProjectLibraryPage(
  props: ServerSideComponentProp<{ virtualLabId: string; projectId: string }, null>
) {
  const { virtualLabId, projectId } = await props.params;

  return <BookmarkTabs labId={virtualLabId} projectId={projectId} />;
}
