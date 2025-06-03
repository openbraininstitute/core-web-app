import HeaderHome from './HeaderHome';
import SliderTutorial from './slider-tutorials';

export default function DocumentationHomepage() {
  return (
    <div className="relative flex w-full flex-col gap-y-6">
      <HeaderHome />
      <SliderTutorial />
    </div>
  );
}
