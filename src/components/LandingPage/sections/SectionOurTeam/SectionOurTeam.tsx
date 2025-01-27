import React from 'react';

import Hero from '../../Hero';
import VerticalRuler from '../../VerticalRuler';
// import Button from '../../Button';
// import VerticalSpace from '../../VerticalSpace';
import TeamMember from './TeamMember';
import employeesList from './employees-list';

import HeroURL from './images/hero.jpg';
import BoardHenryURL from './images/board/henry-markram.jpg';
import BoardKamilaURL from './images/board/kamila-markram.jpg';
import BoardJavierURL from './images/board/javier-peroquieta.jpg';
import BoardSeanURL from './images/board/sean-hill.jpg';
import BoardSegevURL from './images/board/segev-idan.jpg';
import ChiefExecutiveOfficerURL from './images/CEO.webp';
import ChiefTechnicalOfficerURL from './images/CTO.webp';
import ChiefScientistOfficerURL from './images/CSO.webp';
import MachineLearningURL from './images/machine-learning.jpg';
import ScientistURL from './images/scientist.jpg';
import SoftwareURL from './images/software.jpg';
import VisualizationURL from './images/visualisation.jpg';
import { classNames } from '@/util/utils';
import styles from './SectionOurTeam.module.css';

export interface SectionOurTeamProps {
  className?: string;
}

export default function SectionOurTeam({ className }: SectionOurTeamProps) {
  const employees = React.useMemo(
    () =>
      employeesList.sort((e1, e2) => {
        const lastName1 = e1.lastName.toLowerCase();
        const lastName2 = e2.lastName.toLowerCase();
        if (lastName1 < lastName2) return -1;
        if (lastName1 > lastName2) return +1;
        const firstName1 = e1.firstName.toLowerCase();
        const firstName2 = e2.firstName.toLowerCase();
        if (firstName1 < firstName2) return -1;
        if (firstName1 > firstName2) return +1;
        return 0;
      }),
    []
  );
  return (
    <div className={classNames(className, styles.sectionOurTeam)}>
      <Hero
        title="Our Team"
        content="Discover the passionate scientists, developers, and innovators driving the Open Brain Platform."
        backgroundType="image"
        backgroundURL={HeroURL.src}
        next="Discover our members"
      />
      <h1>Board</h1>
      <div className={styles.people}>
        <div className={styles.board}>
          <TeamMember big name="Henry Markram" profile="President" image={BoardHenryURL.src} />
          <TeamMember
            big
            name="Kamila Markram"
            profile="Vice-president"
            image={BoardKamilaURL.src}
          />
        </div>
      </div>
      <div className={styles.people}>
        <div className={styles.board}>
          <TeamMember
            big
            name="Javier Felipe Oroquieta"
            profile="Member"
            image={BoardJavierURL.src}
          />
          <TeamMember big name="Sean Hill" profile="Member" image={BoardSeanURL.src} />
          <TeamMember big name="Segev Idan" profile="Member" image={BoardSegevURL.src} />
        </div>
      </div>
      <h1>Executive board</h1>
      <div className={styles.people}>
        <TeamMember
          big
          name="Georges Khazen"
          profile="Chief Executive Officer"
          image={ChiefExecutiveOfficerURL.src}
        />
        <TeamMember
          big
          name="Jean-Denis Courcol"
          profile="Chief Technical Officer"
          image={ChiefTechnicalOfficerURL.src}
        />
        <TeamMember
          big
          name="Michael Reimann"
          profile="Chief Scientific Officer"
          image={ChiefScientistOfficerURL.src}
        />
      </div>
      <h1>The team</h1>
      <div className={styles.people}>
        {employees
          .filter((e) => e.profile !== 'Executive')
          .map((e) => (
            <TeamMember
              key={`${e.firstName} ${e.lastName}`}
              name={`${e.firstName} ${e.lastName}`}
              profile={e.profile}
              image={figureOutImageFromRole(e.profile)}
            />
          ))}
      </div>
      <VerticalRuler />
      {/* <h1>Wish to join our team?</h1>
      <p>
        Are you passionate about neuroscience, technology, or data science? Be part of a dynamic
        team working to advance brain research through innovation and collaboration.
      </p>
      <VerticalSpace height="4rem" />
      <p>
        <Button
          subTitle="Lausanne, Switzerland"
          title="Head of Marketing"
          onClick={mailto('Head of Marketing')}
          align="start"
        />
        <Button
          subTitle="Lausanne, Switzerland"
          title="R&D scientist"
          onClick={mailto('R&D scientist')}
          align="start"
        />
      </p> */}
    </div>
  );
}

// function mailto(subject: string) {
//   return `mailto:carreers@openbraininstitute.org?subject=Application to ${encodeURIComponent(subject)}`;
// }

function figureOutImageFromRole(role: string): string {
  switch (role) {
    case 'R&D Scientist':
      return ScientistURL.src;
    case 'Software Engineer':
      return SoftwareURL.src;
    case 'Machine Learning Engineer':
      return MachineLearningURL.src;
    case 'Visualization Engineer':
      return VisualizationURL.src;
    default:
      return '';
  }
}
