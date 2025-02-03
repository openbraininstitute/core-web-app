import React from 'react';
import { useSession } from 'next-auth/react';

import Button from '../Button';
import { basePath } from '@/config';

export interface LoginPanelProps {}

export default function LoginPanel() {
  const { status } = useSession();

  return status === 'authenticated' ? (
    <Button onClick="/virtual-lab" subTitle="Go to" title="The platform" />
  ) : (
    <Button
      onClick={`/log-in?callbackUrl=${basePath}/virtual-lab`}
      subTitle="Log in to"
      title="The platform"
    />
  );
}
