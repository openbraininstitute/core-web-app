import { atom } from 'jotai';

export enum EnumSection {
  TermsAndConditions = -2,
  Home = -1,
  Institute = 0,
  OurMission = 1,
  Pricing = 2,
  OurTeam = 3,
  Contact = 4,
}

export const atomSection = atom(EnumSection.Home);
