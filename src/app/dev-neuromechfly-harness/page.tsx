// LOCAL TEST ONLY, remove before committing (with its FREE_ACCESS_PAGES entry in src/proxy.ts).
import { HarnessLoader } from './loader';

export default function Page() {
  return <HarnessLoader />;
}
