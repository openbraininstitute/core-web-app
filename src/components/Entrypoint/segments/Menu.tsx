import { useSearchParams } from 'next/navigation';

import { OBPLogo } from './Splash';

import PrimaryButtonHome from '@/components/home/PrimaryButtonHome';
import { CloseIcon } from '@/components/icons';
import MenuMobileIcon from '@/components/icons/MenuMobileIcon';
import { basePath } from '@/config';
import { classNames } from '@/util/utils';
import { useState } from 'react';
import MobileMenu from './MobileMenu';

interface MenuItemProps {
  title: string;
  bgcolor?: string;
}
interface MenuButtonProps extends MenuItemProps {
  action?: <T, RT>(input: T) => RT;
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

export default function EntrypointMenu() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

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
        <PrimaryButtonHome
          label="BlueBrain Github"
          url="https://github.com/BlueBrain"
          hasIcon
          theme="dark"
        />
        {/* TODO: Re-enable once the page on AWS is available */}
        {/* <PrimaryButtonHome
          label="BlueBrain Open data"
          url="https://registry.opendata.aws/"
          hasIcon
          theme="dark"
        /> */}
        <PrimaryButtonHome label="About" url="/about" hasIcon={false} theme="dark" />
        <PrimaryButtonHome label="Log in" url="/log-in" hasIcon={false} theme="light" />
      </div>
    </div>
  );
}
