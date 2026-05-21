import { keycloakLogout } from '@/util/server-utils';

import Logout from './Logout';

export default async function LogoutPage() {
  await keycloakLogout();
  return <Logout />;
}
