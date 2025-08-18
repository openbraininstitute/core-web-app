import GetStartedBanner from '@/ui/segments/help/overview/get-started-banner';
import TutorialTriptych from '@/ui/segments/help/tutorials/tutorial-triptych';

export default function OverviewSection() {
  return (
    <div className="flex flex-col">
      <GetStartedBanner />
      <TutorialTriptych />
    </div>
  );
}
