import { DiscoverList } from '@/ui/segments/project/get-started/sections/discover';
import { MainVideo } from '@/ui/segments/project/get-started/sections/main-video';
import { MainCards } from '@/ui/segments/project/get-started/sections/quick-access-main-cards';

export default function Page() {
  return (
    <div className="w-full flex flex-col pr-2">
      <MainCards />
      <MainVideo />
      <DiscoverList />
    </div>
  );
}
