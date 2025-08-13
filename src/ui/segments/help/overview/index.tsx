import TutorialTriptych from '../tutorials/tutorials-triptych';
import GetStartedBanner from './get-started-banner';

export default function OverviewSection() {
  return (
    <div className="flex flex-col">
      <GetStartedBanner />
      <TutorialTriptych />
    </div>
  );
}
