import React from 'react';
import { useSession } from 'next-auth/react';

import Button from '../Button';
import { basePath } from '@/config';
import { gotoSection } from '@/components/LandingPage/utils';
import { EnumSection } from '@/components/LandingPage/sections/sections';

export interface LoginPanelProps {}

export default function LoginPanel() {
  return (
    <Button
      onClick={() => gotoSection(EnumSection.ComingSoon)}
      title="the Platform"
      subTitle="Log in to"
    />
  );

  const { status } = useSession();

  return status === 'authenticated' ? (
    <Button onClick="/virtual-lab" subTitle="Go to" title="the Platform" />
  ) : (
    <Button
      onClick={`/app/log-in?callbackUrl=${basePath}/virtual-lab`}
      subTitle="Log in to"
      title="the Platform"
    />
  );
}
