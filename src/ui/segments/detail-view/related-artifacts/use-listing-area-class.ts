import { useMiniDetailView } from '@/ui/segments/mini-detail-view/event';
import { cn } from '@/utils/css-class';

/**
 * `BrowseEntityScope`'s `[grid-area:body]`/`[grid-area:mini-view]` classes only take
 * effect inside a `display:grid` ancestor naming those areas: the main Data-browse
 * page provides one, this tab doesn't, so each listing brings its own (mirrors
 * `browse-widget.tsx`'s local-wrapper pattern).
 */
export function useListingAreaClass() {
  const { mdv } = useMiniDetailView();
  return cn('grid h-[calc(100vh-18rem)] min-h-96 gap-2 overflow-hidden', {
    "grid-cols-[minmax(0,1fr)_minmax(30rem,44rem)] [grid-template-areas:'body_mini-view']": mdv,
    "grid-cols-1 [grid-template-areas:'body']": !mdv,
  });
}
