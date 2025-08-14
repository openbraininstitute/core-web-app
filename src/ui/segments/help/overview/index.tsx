import TutorialTriptych from '../tutorials/tutorial-triptych';
import GetStartedBanner from './get-started-banner';

export default function OverviewSection() {
  return (
    <div className="flex flex-col">
      <GetStartedBanner />
      <TutorialTriptych />
    </div>
  );
}
