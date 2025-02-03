import React from 'react';

import Hero from '../../Hero';
import VerticalRuler from '../../VerticalRuler';
import VerticalSpace from '../../VerticalSpace';
// import MissionStatement from './MissionStatement';
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
        content="Expanding the Open Brain Platform capabilities to give access to a wide range of model to all neuroscientist around the world"
        backgroundType="image"
        backgroundURL={HeroURL.src}
        next="Discover our mission"
      />
      <h1>Launch your virtual lab and perform neuroscience at the speed of thought</h1>
      <p>
        The Open Brain Institute is a non-profit organization whose mission is to accelerate
        neuroscience research through the creation and dissemination of advanced digital brain
        models.
      </p>
      <p>
        The Institute’s core objective is to build a comprehensive repository of high-fidelity
        digital brain models, encompassing the complexity and diversity of brain tissue across
        species. These models will serve as an invaluable resource for researchers globally,
        enabling unprecedented exploration of brain structure and function. This repository is not
        merely a data archive or brain atlas; it is a dynamic, evolving resource constantly updated
        with new data, software and model refinements.
      </p>
      <p>
        Central to the Institute’s mission is the creation and maintenance of a collaborative
        virtual laboratory infrastructure. This collaborative environment provides researchers with
        seamless access to advanced computational resources, including cloud compute clusters,
        specialized brain modeling and simulation software, comprehensive data analysis and
        visualization tools, and interactive chat capabilities, allowing them to perform
        neuroscience “at the speed of thought”.{' '}
      </p>
      <VerticalSpace height="4rem" />
      <ul>
        <li>
          <big>Explore</big>
          <p>
            Researchers have the ability to conduct atlas-driven exploration of existing
            experimental data, model data, digital brain models, and simulations. This structured
            and systematic exploration is further enhanced by powerful literature mining tools
            ensuring that their investigations are grounded in the most current and relevant
            scientifc information.
          </p>
        </li>
        <li>
          <big>Build</big>
          <p>
            The virtual lab provides the tools and resources for researchers to build their own
            custom brain models, either from scratch or by modifying and extending existing models.
            This empowers researchers to test their hypotheses and develop novel approaches to
            understanding the brain.
          </p>
        </li>
        <li>
          <big>Experiment</big>
          <p>
            The environment supports cutting-edge simulations, allowing researchers to run
            experiments, test hypothesis, and model complex brain processes in a controlled and
            reproducible manner. This avoids the limitations inherent in traditional experimentation
          </p>
        </li>
        <li>
          <big>Collaborate</big>
          <p>
            The virtual lab fosters seamless collaboration among researchers worldwide. It
            facilitates real-time interaction, shared data analysis, and joint model development.
            Features such as integrated communication tools, version control systems, and
            collaborative annotation capabilities enhance teamwork and accelerate scientifc
            progress. Access control and data security are paramount, ensuring the integrity and
            confdentiality of research data.
          </p>
        </li>
      </ul>
      <VerticalRuler />
      <p>
        Through this integrated approach to digital brain modeling and collaborative virtual
        laboratories, the Open Brain Institute aims to accelerate scientifc discovery, democratize
        access to advanced research tools, and ultimately, lead to transformative breakthroughs in
        understanding and treating neurological disorders, advancing cognitive science, and pushing
        the boundaries of artifcial intelligence.
      </p>
    </div>
  );
}
