import { BrainsLandingClient } from './brains-landing-client';
import { PublicLandingProviders } from './public-landing-providers';

/** Public tour: no session lookup or platform initialization on the critical path. */
export function BrainsLanding() {
  return (
    <PublicLandingProviders>
      <BrainsLandingClient />
    </PublicLandingProviders>
  );
}

export default BrainsLanding;
