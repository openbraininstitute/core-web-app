import React from 'react';

import Button from '../../Button';
import { basePath } from '@/config';

export interface LoginPanelProps {}

export default function LoginPanel() {
  return (
    <Button
      onClick={`/log-in?callbackUrl=${basePath}/virtual-lab`}
      subTitle="Login to"
      title="The platform"
      className="border-none"
    />
  );
}
