import ComingSoonBanner from './ComingSoonBanner';
import HeaderHome from './HeaderHome';
import SliderTutorial from './slider-tutorials';

export default function DocumentationHomepage() {
  return (
    <div className="relative flex w-full flex-col gap-y-6">
      <HeaderHome />
      <SliderTutorial />
      {/* <SliderGuidel />
      <SliderWorkshop /> */}
      <ComingSoonBanner
        title="Step-by-step guide coming soon"
        description="We are working on a comprehensive guide to help you get started with our platform. Stay tuned!"
        imgUrl="/images/documentation/coming-soon-background.webp"
      />
      <ComingSoonBanner
        title="Workshop videos coming soon"
        description="We are preparing a series of workshop videos to help you understand our platform better. Stay tuned!"
        imgUrl="/images/documentation/coming-soon-background.webp"
      />
    </div>
  );
}
