import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { OBPLogo } from './Splash';
import MobileMenu from './MobileMenu';
import PrimaryButtonHome from '@/components/home/PrimaryButtonHome';
import MenuMobileIcon from '@/components/icons/MenuMobileIcon';
import { CloseIcon } from '@/components/icons';
import { basePath } from '@/config';
import { classNames } from '@/util/utils';

interface MenuItemProps {
  title: string;
  bgcolor?: string;
}
interface MenuButtonProps extends MenuItemProps {
  action?: <T, RT>(input: T) => RT;
}

interface EntrypointMenuProps {
  callbackUrl?: string;
  displayBBGithub?: boolean;
  displayAbout?: boolean;
  displayLogin?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function MenuButton({ bgcolor, title, action }: MenuButtonProps) {
  const params = useSearchParams();
  const origin = params?.get('origin');
  const callbackUrl = origin ? `${basePath}${decodeURIComponent(origin)}` : `${basePath}/main`;

  return (
    <button type="button" aria-label={title} onClick={() => action?.(callbackUrl)}>
      <MenuItem {...{ bgcolor, title }} />
    </button>
  );
}

const defaultBgColor = 'bg-primary-8';

function MenuItem({ title, bgcolor = defaultBgColor }: MenuItemProps) {
  return (
    <div
      className={classNames(
        'box-border h-auto w-[168px] cursor-pointer py-4 hover:bg-primary-4',
        bgcolor
      )}
    >
      <h3 className="my-auto pl-8 text-left text-xl font-semibold text-white">{title}</h3>
    </div>
  );
}

export default function EntrypointMenu({
  callbackUrl = '',
  displayBBGithub = true,
  displayAbout = true,
  displayLogin = true,
}: EntrypointMenuProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const { status } = useSession();
  return (
    <div className="fixed z-50 flex w-full flex-row items-start justify-between px-6 pt-6 md:items-center">
      <OBPLogo />
      <button
        type="button"
        aria-label="Menu mobile"
        className="relative z-[9999] flex h-11 w-11 items-center justify-center  md:hidden"
        style={{
          background: isMobileMenuOpen ? 'transparent' : '#0050b3',
        }}
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? (
          <CloseIcon iconColor="white" className="h-4 w-auto" />
        ) : (
          <MenuMobileIcon iconColor="white" className="h-4 w-auto" />
        )}
      </button>
      <MobileMenu style={{ left: isMobileMenuOpen ? '0' : '100vw' }} />
      <div className="relative hidden justify-between gap-1 md:flex ">
        {/* TODO: Re-enable hidden buttons after SfN */}
        {/* <MenuLink title="Getting Started" href="#" /> */}
        {displayBBGithub && (
          <PrimaryButtonHome
            label="BlueBrain Github"
            url="https://github.com/BlueBrain"
            hasIcon
            theme="dark"
          />
        )}
        {/* TODO: Re-enable once the page on AWS is available */}
        {/* <PrimaryButtonHome
          label="BlueBrain Open data"
          url="https://registry.opendata.aws/"
          hasIcon
          theme="dark"
        /> */}
        {displayAbout && (
          <PrimaryButtonHome label="About" url="/about" hasIcon={false} theme="dark" />
        )}
        {displayLogin &&
          (status === 'authenticated' ? (
            <PrimaryButtonHome
              label="Log in"
              url={`/app/log-in?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              hasIcon={false}
              theme="dark"
            />
          ) : (
            <PrimaryButtonHome
              label="Go to the platform"
              url="/coming-soon"
              // url="/app/virtual-lab"
              hasIcon={false}
              theme="dark"
            />
          ))}
      </div>
    </div>
  );
}
