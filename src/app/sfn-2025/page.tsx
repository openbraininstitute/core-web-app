import LandingPageShell from '@/ui/segments/landing/landing-page-shell';
import FooterServer from '@/ui/segments/landing/layout/footer/footer-server';
import Menu from '@/ui/segments/landing/layout/menu/menu';
import ContentSFN from '@/ui/segments/sfn-2025/content';
import HeroSFN from '@/ui/segments/sfn-2025/hero';

export default function Page() {
  return (
    <LandingPageShell>
      <Menu />
      <HeroSFN
        videoURL="https://player.vimeo.com/progressive_redirect/playback/1129107045/rendition/1080p/file.mp4?loc=external&log_user=0&signature=24971da0f0dba7530737456770428772dfed7fd99b400c3f31e41638bf741059"
        posterURL="/video/thumb.jpg"
        posterWidth={1920}
        posterHeight={108}
        title="Visit Us at SfN 2025 and Experience Our Virtual Labs in Action!"
      />
      <ContentSFN />
      <FooterServer />
    </LandingPageShell>
  );
}
