import AboutContent from './content';
import AboutNavigation from './navigation';

export default function AboutSection() {
  return (
    <div className="grid h-full w-full grid-cols-4 gap-x-6">
      <AboutNavigation />
      <AboutContent />
    </div>
  );
}
