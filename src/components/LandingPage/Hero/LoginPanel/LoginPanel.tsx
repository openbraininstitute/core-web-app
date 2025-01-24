import React from 'react';

import Button from '../../Button';

export interface LoginPanelProps {}

export default function LoginPanel() {
  return <Button onClick="/log-in" subTitle="Login to" title="The platform" />;
}
