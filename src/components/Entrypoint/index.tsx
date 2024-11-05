'use client';

import Footer from '../AboutSFN/Blocs/Footer';
import HeaderScreen from '../home/screens/HeaderScreen';
import ScreenBBGithub from '../home/screens/ScreenBBGithub';
import ScreenContributors from '../home/screens/ScreenContributors';
import { AcceptInviteErrorDialog, Menu } from './segments';

export default function Entrypoint({ errorCode }: { errorCode?: string }) {
  return (
    <div className="relative flex w-screen flex-col bg-primary-9">
      <Menu />
      <div className="h-auto overflow-x-hidden overflow-y-scroll md:h-screen md:snap-y md:snap-mandatory">
        <HeaderScreen />
        <ScreenBBGithub />
        {/* TODO: Re-enable once the page on AWS is available */}
        {/* <ScreenOpenData /> */}
        <ScreenContributors />
        <Footer className="snap-start snap-always" />
      </div>
      {errorCode && <AcceptInviteErrorDialog errorCode={errorCode} />}
    </div>
  );
}
