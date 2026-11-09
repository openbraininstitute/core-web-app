import PaddedBlock from './components/padded-block';
import VerticalSpace from './components/vertical-space';
import LandingPageShell from './landing-page-shell';
import FooterServer from './layout/footer/footer-server';
import HeroServer from './layout/hero/hero-server';
import Menu from './layout/menu/menu';
import SectionRouter from './sections/section-router';
import { EnumSection } from './sections/sections';

import type { LandingPageError } from './landing-page-shell';

export type LandingPageProps = {
  className?: string;
  section: EnumSection;
  error?: LandingPageError;
};

export default async function LandingPage({ className, section, error }: LandingPageProps) {
  return (
    <LandingPageShell className={className} section={section} error={error}>
      <Menu />
      <HeroServer section={section} />
      {section !== EnumSection.Contact && (
        <>
          <PaddedBlock>
            <SectionRouter section={section} />
          </PaddedBlock>
          <VerticalSpace height="30px" />
        </>
      )}
      <FooterServer />
    </LandingPageShell>
  );
}
