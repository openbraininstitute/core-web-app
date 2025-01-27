import React from 'react';

import Illustration1 from './illustration-1.jpg';
import Illustration2 from './illustration-2.jpg';
import Illustration3 from './illustration-3.jpg';
import Illustration4 from './illustration-4.jpg';

import Card from './Card';
import { classNames } from '@/util/utils';
import styles from './Cards.module.css';

export interface CardsProps {
  className?: string;
}

export default function Cards({ className }: CardsProps) {
  return (
    <div className={classNames(className, styles.cards)}>
      <Card subTitle="Integrate" title="Experimental Data" image={Illustration1.src}>
        Collaborate with our team to bring new data and maintain the quality and the integrity of
        those
      </Card>
      <Card subTitle="Incorporate" title="New brain models" image={Illustration2.src}>
        Bring your model and let us adapt, validate and maintain your parameters
      </Card>
      <Card subTitle="Test" title="Disease models" image={Illustration3.src}>
        Collaborate with our team tobring new data and maintain the quality and integrity of those
      </Card>
      <Card subTitle="Request" title="New simulation features" image={Illustration4.src}>
        Bring your model and let us adapt, validate and maintain your parameters
      </Card>
    </div>
  );
}
