import { auth } from '@/auth';

import PaddedBlock from './components/padded-block';
import VerticalSpace from './components/vertical-space';
import LandingPageShell from './landing-page-shell';
import FooterServer from './layout/footer/footer-server';
import HeroServer from './layout/hero/hero-server';
import Menu from './layout/menu/menu';
import SectionRouter from './sections/section-router';

import type { LandingPageError } from './landing-page-shell';
import type { EnumSection } from './sections/sections';

export type LandingPageProps = {
  className?: string;
  section: EnumSection;
  error?: LandingPageError;
};

export default async function LandingPage({ className, section, error }: LandingPageProps) {
  const session = await auth();
  const isAuthenticated = Boolean(session?.user && !session.error);

  return (
    <LandingPageShell className={className} section={section} error={error}>
      <Menu section={section} isAuthenticated={isAuthenticated} />
      <HeroServer section={section} />
      <PaddedBlock>
        <SectionRouter section={section} />
      </PaddedBlock>
      <VerticalSpace height="30px" />
      <FooterServer />
    </LandingPageShell>
  );
}
