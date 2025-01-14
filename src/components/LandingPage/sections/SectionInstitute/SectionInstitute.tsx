import React from 'react';

import VerticalRuler from '../../VerticalRuler';
import Hero from '../../Hero';
import Button from '../../Button';
import Milestones from './Milestones';
import HeroURL from './hero.jpg';
import { classNames } from '@/util/utils';

import styles from './SectionInstitute.module.css';

export interface SectionInstituteProps {
  className?: string;
  onNext(): void;
}

export default function SectionInstitute({ className, onNext }: SectionInstituteProps) {
  return (
    <div className={classNames(className, styles.sectionInstitute)}>
      <Hero
        title="The Institute"
        content="Working toward a future of neuroscience model building and simulation open to the whole world"
        backgroundType="image"
        backgroundURL={HeroURL.src}
        next="Discover the whole story"
      />
      <h1>
        <big>2005</big>
        When it all started
      </h1>
      <p>
        The Blue Brain Project, launched in 2005 by EPFL (École Polytechnique Fédérale de Lausanne)
        in Switzerland, marked a pioneering effort to digitally reconstruct and simulate the
        mammalian brain. Led by neuroscientist Henry Markram, the project began with the ambitious
        goal of creating a biologically detailed model of the brain to deepen our understanding of
        its structure and function. The initial focus was on reconstructing a single neocortical
        column of a rat brain, chosen for its well-mapped architecture and role in fundamental
        neural processes. Combining advanced computing power with vast datasets from experimental
        neuroscience, the project aimed to bridge the gap between biological and digital models,
        setting the stage for breakthroughs in neuroscience, artificial intelligence, and
        computational biology.
      </p>
      <VerticalRuler />
      <Milestones />
      <VerticalRuler />
      <h1>
        <big>2025</big>
        Becoming the Open Brain Platform
      </h1>
      <p>
        The Blue Brain Project, launched in 2005 by EPFL (École Polytechnique Fédérale de Lausanne)
        in Switzerland, marked a pioneering effort to digitally reconstruct and simulate the
        mammalian brain. Led by neuroscientist Henry Markram, the project began with the ambitious
        goal of creating a biologically detailed model of the brain to deepen our understanding of
        its structure and function. The initial focus was on reconstructing a single neocortical
        column of a rat brain, chosen for its well-mapped architecture and role in fundamental
        neural processes. Combining advanced computing power with vast datasets from experimental
        neuroscience, the project aimed to bridge the gap between biological and digital models,
        setting the stage for breakthroughs in neuroscience, artificial intelligence, and
        computational biology.
      </p>
      <p>
        <Button subTitle="Discover" title="Our mission" onClick={onNext} />
      </p>
    </div>
  );
}
