import React from 'react';

import Hero from '../../Hero';
import VerticalRuler from '../../VerticalRuler';
import MissionStatement from './MissionStatement';
import HeroURL from './hero.jpg';
import { classNames } from '@/util/utils';
import styles from './SectionOurMission.module.css';

export interface SectionOurMissionProps {
  className?: string;
}

export default function SectionOurMission({ className }: SectionOurMissionProps) {
  return (
    <div className={classNames(className, styles.sectionOurMission)}>
      <Hero
        title="Our Mission"
        content="Expanding the Open Brain Platform capabilities to give access to a wide range of models to all neuroscientists around the world"
        backgroundType="image"
        backgroundURL={HeroURL.src}
        next="Discover our mission"
      />
      <h1>Reaching scales and steps one at the time throughout the years</h1>
      <p>
        The Blue Brain Project, launched in 2005 by EPFL (École Polytechnique Fédérale de Lausanne)
        in Switzerland, marked a pioneering effort to digitally reconstruct and simulate the
        mammalian brain. Led by neuroscientist Henry Markram, the project began with the ambitious
        goal of creating a biologically detailed model of the brain to deepen our understanding of
        its structure and function.{' '}
      </p>
      <ul>
        <li>
          <big>Advance Neuroscience Understanding</big>
          <p>
            Develop tools that enable detailed exploration of brain structure and function, driving
            insights into neural processes and disorders.
          </p>
        </li>
        <li>
          <big>Innovate Digital Brain Modeling</big>
          <p>
            Create state-of-the-art platforms for constructing biologically realistic digital brain
            models at multiple scales, from single neurons to whole systems.
          </p>
        </li>
        <li>
          <big>Enable Predictive Simulations</big>
          <p>
            Provide robust simulation environments that facilitate hypothesis testing, predictive
            modeling, and exploration of neural dynamics.
          </p>
        </li>
        <li>
          <big>Support Collaborative Research</big>
          <p>
            Foster a global network of researchers by offering open, interoperable tools and
            datasets for shared discovery and innovation.
          </p>
        </li>
        <li>
          <big>Accelerate Translational Applications</big>
          <p>
            Bridge the gap between basic research and practical applications in medicine, education,
            and artificial intelligence through actionable insights from simulations.
          </p>
        </li>
      </ul>
      <VerticalRuler />
      <MissionStatement />
    </div>
  );
}
