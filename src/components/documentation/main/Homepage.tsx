import HeaderHome from './HeaderHome';
import SliderGuidel from './slider-guides';
import SliderTutorial from './slider-tutorials';
import SliderWorkshop from './slider-workshops';

export default function DocumentationHomepage() {
  return (
    <div className="relative flex w-full flex-col gap-y-6">
      <HeaderHome />
      <SliderTutorial />
      <SliderGuidel />
      <SliderWorkshop />
    </div>
  );
}
