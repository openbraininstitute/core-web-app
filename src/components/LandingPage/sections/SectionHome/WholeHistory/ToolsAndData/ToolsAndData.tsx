import React from 'react';
import Image from 'next/image';

import PictureURL from './picture.webp';
import { classNames } from '@/util/utils';
import Button from '@/components/LandingPage/Button';

import styles from './ToolsAndData.module.css';

export interface ToolsAndDataProps {
  className?: string;
}

export default function ToolsAndData({ className }: ToolsAndDataProps) {
  return (
    <div className={classNames(className, styles.toolsAndData)}>
      <div className="w-full h-[60vh] flex flex-row">
        <div className="w-2/3 flex flex-col justify-between p-6 bg-neutral-1">
          <h2>Blue Brain Tools & Data</h2>
          <div className="flex flex-col">
            <h3>fostering transparency</h3>
            <p>
            The Open Brain Platform is built on the Blue Brain Project’s legacy. All Blue Brain’s tools and services are open source with a permissive license on the Blue Brain Project’s Github repository.
            </p>
          </div>
        </div>
        <div className="w-1/3 overflow-hidden bg-black">
          <Image src={PictureURL} alt="Prefer to go it alone?" className="w-full h-full object-cover" width="1200" height="800" />
        </div>
      </div>
      <footer>
        <Button subTitle="View on" title="Github" onClick="https://github.com/BlueBrain" />
        <Button
          subTitle="Discover"
          title="Blue Brain Open Data"
          onClick="https://registry.opendata.aws/bluebrain_opendata/"
        />
      </footer>
    </div>
  );
}
