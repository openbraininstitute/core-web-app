import { getSocialMediaLinks } from '@/content/website/shared';

import FooterPanel from './footer-panel';

export default async function FooterServer() {
  const socialMediaLinks = await getSocialMediaLinks();

  return <FooterPanel socialMediaLinks={socialMediaLinks} />;
}
