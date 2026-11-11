import { getSocialMediaLinks } from '@/services/sanity/api/get-social-media';

import FooterPanel from './footer-panel';

export default async function FooterServer() {
  const socialMediaLinks = await getSocialMediaLinks();

  return <FooterPanel socialMediaLinks={socialMediaLinks} />;
}
