import React from 'react';

import VerticalRuler from '../../../VerticalRuler';
// import FooterPanel from "../../../FooterPanel"
// import CommunityPanel from "./CommunityPanel"
import ToolsAndData from './ToolsAndData';
// import TimeLine from './TimeLine';
import ContributorsPanel from './ContributorsPanel';
import VirtualLabsPanel from './VirtualLabsPanel';
import PortalsPanel from './PortalsPanel';
import { classNames } from '@/util/utils';

import styles from './Home.module.css';

export interface HomeProps {
  className?: string;
}

export default function Home({ className }: HomeProps) {
  return (
    <div className={classNames(className, styles.Home)}>
      <VirtualLabsPanel />
      <VerticalRuler />
      {/* <h1>Dig through the timeline and keep an eye on the future</h1> */}
      {/* <TimeLine /> */}
      <VerticalRuler />
      <ToolsAndData />
      <VerticalRuler />
      <PortalsPanel />
      <VerticalRuler />
      {/* <h1>
                Be part of the community and bring
                your piece to the platform
            </h1>
            <CommunityPanel />
            <Ruler /> */}
      <ContributorsPanel />
    </div>
  );
}
