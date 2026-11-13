import { classNames } from '@/util/utils';

import ObiLogo from './obi-logo';

export function ObiLogoSvg({ className }: { className?: string }) {
  return <ObiLogo className={classNames('h-[56px] w-[176px]', className)} />;
}

export default ObiLogoSvg;
