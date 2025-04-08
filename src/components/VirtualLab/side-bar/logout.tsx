'use client';

import { Button } from 'antd';

import { signOut } from '@/util/utils';

export default function Logout() {
  return (
    <Button
      key="logout"
      type="text"
      size="large"
      htmlType="button"
      className="text-white hover:text-white!"
      onClick={signOut}
    >
      Logout
    </Button>
  );
}
