import React from 'react';

import Hero from '../../Hero';
import VerticalRuler from '../../VerticalRuler';
import VerticalSpace from '../../VerticalSpace';
// import MissionStatement from './MissionStatement';
import CenteredColumn from '../../CenteredColumn';
import { EnumSection } from '../sections';
import MissionStatement from './MissionStatement';
import { classNames } from '@/util/utils';
import styles from './SectionOurMission.module.css';

export interface SectionOurMissionProps {
  className?: string;
}

export default function SectionOurMission({ className }: SectionOurMissionProps) {
  return (
    <div className={classNames(className, styles.sectionOurMission)}>
      <Hero section={EnumSection.OurMission} />
      <h1>
        The Open Brain Institute’s core objective is to build a comprehensive repository of
        high-fidelity digital brain models.
      </h1>
      <p>
        The Open Brain Institute is a non-profit organization whose mission is to empower
        researchers and organizations with advanced digital brain building technology to perform
        neuroscience “at the speed of thought”.
      </p>
      <p>
        Central to our mission is the establishment of a collaborative virtual laboratory
        infrastructure, known as “Virtual Labs”. This dynamic environment provides seamless access
        to advanced brain building tools and computational resources, including cloud compute
        clusters, specialized brain modeling and simulation software, and robust data analysis and
        visualization capabilities. These resources enable researchers to use, improve, refine and
        build advanced digital brain models and ultimately accelerate neuroscience research.
      </p>
      <p>
        The Open Brain Institute’s core objective is to build a comprehensive repository of
        high-fidelity digital brain models, encompassing the complexity and diversity of brain
        tissue across species and at different scales. This repository serves as an invaluable
        resource for researchers globally, facilitating unprecedented exploration of brain structure
        and function. More than just a data archive, it is a dynamic and evolving resource,
        continuously updated with new data, software and model refinements.
      </p>
      <VerticalSpace height="4rem" />
      <h1>
        The Virtual Labs and repository are hosted on the Open Brain Platform and provide the
        following key functionalities:
      </h1>
      <ul>
        <li>
          <big>Explore</big>
          <p>
            Researchers have the ability to conduct atlas-driven exploration of existing
            experimental data, model data, digital brain models, and simulations. This structured
            and systematic exploration is further enhanced by powerful literature mining tools
            ensuring that their investigations are grounded in the most current and relevant
            scientific information.
          </p>
        </li>
        <li>
          <big>Build</big>
          <p>
            Our platform equips researchers with tools to create custom brain models at multiple
            scales, either from scratch or by modifying existing ones, empowering hypothesis testing
            and innovative approaches to understanding the brain.
          </p>
        </li>
        <li>
          <big>Experiment</big>
          <p>
            The environment supports advanced simulations and analysis, enabling researchers to run
            experiments and model complex brain processes in a controlled, reproducible
            setting—extending possibilities beyond traditional biological labs.
          </p>
        </li>
        <li>
          <big>Collaborate</big>
          <p>
            The environment supports advanced simulations and analysis, enabling researchers to run
            experiments and model complex brain processes in a controlled, reproducible
            setting—extending possibilities beyond traditional biological labs.
          </p>
        </li>
      </ul>
      <VerticalRuler />
      <p>
        Through this integrated approach to digital brain modeling and collaborative virtual
        laboratories, the Open Brain Institute aims to accelerate scientific discovery, democratize
        access to advanced research tools, and drive transformative breakthroughs in understanding
        and treating neurological disorders, advancing cognitive science, and pushing the boundaries
        of artificial intelligence.
      </p>
      <VerticalSpace />
      <CenteredColumn>
        <MissionStatement />
      </CenteredColumn>
    </div>
  );
}
