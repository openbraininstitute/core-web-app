'use client';

import { CloseOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';

export default function Close() {
  const router = useRouter();

  return (
    <CloseOutlined className="absolute top-0 right-0 text-2xl" onClick={() => router.back()} />
  );
}
