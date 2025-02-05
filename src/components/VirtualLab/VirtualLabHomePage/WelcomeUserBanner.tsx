'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CloseOutlined } from '@ant-design/icons';
import { useSession } from 'next-auth/react';
import { Button } from 'antd';
import delay from 'lodash/delay';
import Realistic from 'react-canvas-confetti/dist/presets/realistic';

import { basePath } from '@/config';
import styles from '../VirtualLabBanner/virtual-lab-banner.module.css';

export default function WelcomeUserBanner({ title }: { title?: string }) {
  const { data } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const userName = data?.user.name ?? data?.user.username ?? data?.user.email ?? '';
  const [show, setShow] = useState<boolean>(() => !!params.get('invite_accepted'));
  const [explodeConfetti, setExplodeConfetti] = useState(true);

  useEffect(() => {
    setExplodeConfetti(true);
    const timerId = delay(() => setExplodeConfetti(false), 3000);
    return () => {
      clearTimeout(timerId);
    };
  }, []);

  return (
    show && (
      <>
        {explodeConfetti && (
          <Realistic
            autorun={{ speed: 0.3, duration: 3 }}
            decorateOptions={(options) => ({ ...options, origin: { y: 0.2 }, spread: 270 })}
            className="absolute left-0 top-0 h-full w-full"
            width="100%"
          />
        )}
        <div className="relative z-10 mt-10 flex bg-gradient-to-r from-[#345D36] to-[#6DC371] p-8">
          <div
            className={styles.bannerImg}
            style={{
              backgroundImage: `url(${basePath}/images/virtual-lab/obp_hippocampus_original.webp)`,
            }}
          />
          <div>
            <p>You are now part of the {title}!</p>
            <h4 className="text-xl font-bold">Welcome {userName}</h4>
          </div>
          <Button
            icon={<CloseOutlined className="text-primary-8" />}
            onClick={() => {
              router.push(`${pathname}`);
              setShow(false);
            }}
            ghost
            className="absolute right-4 top-4 cursor-pointer border-none"
          />
        </div>
      </>
    )
  );
}
