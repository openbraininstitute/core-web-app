'use client';

import { ModelView } from '@/ui/segments/project/models/model-views';
import { OriginalHomePage } from '@/ui/segments/project/original-home';
import { FadingStage } from '@/ui/segments/project/walkthrough/stage';
import { Walkthrough } from '@/ui/segments/project/walkthrough/walkthrough';

import {
  BrainsOpening,
  BrainAlone,
  BrainTrio,
  EarlyAdopters,
  FlyInBrain,
  HumanWithBrain,
  ANALYSIS_VIDEO,
  CONFIGURATION_VIDEO,
  MicronsCircuit,
  MouseInBrain,
  NotebooksVideo,
  StageVideo,
  TEACHING_VIDEO,
} from './brain-views';
import { L6_COLOR } from './brains';
import { BRAIN_CHAPTERS, BRAIN_INTRO, SERIF_TITLE } from './chapters';
import { AgentReady } from './agent-ready';
import { CnsBackdrop, FloatingMaleCns, FloatingMicrocircuit } from './floating-model';
import { LandingThemes, ThemeNav } from './landing-themes';
import { MultiplyingBrains } from './multiplying-brains';

import type { TBrainScene } from './chapters';

/** The analysis screen, behind which the Male CNS turns. */
const ANALYSIS_AT = BRAIN_CHAPTERS.findIndex((chapter) => chapter.scene === 'analysis');
/** The landing's words with a screen of their own, by its chapter id: underlined on it, and taking the page there. */
const THEME_LINKS: Record<string, string> = {
  'Virtual Labs': 'start',
  Simulate: 'simulate',
  'Leverage AI': 'agents',
  Explore: 'analysis',
  Teach: 'teach',
  Build: 'microcircuit',
  Learn: 'next',
};
/** The word each screen is about, by its index: its own, and the models' screens Build's. */
const THEME_UNDERLINES: Record<number, string> = Object.fromEntries(
  BRAIN_CHAPTERS.flatMap((chapter, i) => {
    const own = Object.entries(THEME_LINKS).find(([, id]) => id === chapter.id)?.[0];
    const models = ['microcircuit', 'fly', 'mouse', 'microns', 'human'].includes(chapter.id);
    return own ? [[i, own]] : models ? [[i, 'Build']] : [];
  })
);

/**
 * The second walkthrough: the brain modeling course's three brains, a fruit fly's, a mouse's and a
 * human's, turning, and inside each what the platform holds of it. Over its landing the fly's nervous
 * system comes in inside the fly's body, walking, or (`walking` false) alone, turning.
 */
export function BrainsWalkthroughPage({
  walking = true,
  enterHref,
}: {
  walking?: boolean;
  /** Where Enter/the end lead on the public landing, where there is no workspace home to uncover. */
  enterHref?: string;
}) {
  return (
    <Walkthrough
      fullscreen
      bold
      intro={BRAIN_INTRO}
      introTail="for everyone."
      introFoot={<AgentReady />}
      introBase={<LandingThemes />}
      // The first screen's title, as the intro's words rise into it.
      firstTitleClass={SERIF_TITLE}
      // In-app, the home as main has it is uncovered as it ends; on the landing, Enter leads to the app.
      end="main"
      enterHref={enterHref}
      endUnder={enterHref ? undefined : <OriginalHomePage />}
      floating={(state) => (
        <>
          <FloatingMicrocircuit {...state} />
          <FloatingMaleCns {...state} walking={walking} />
          <CnsBackdrop {...state} at={ANALYSIS_AT} />
          <ThemeNav
            entered={state.entered}
            chapter={state.chapter}
            underlines={THEME_UNDERLINES}
            links={THEME_LINKS}
            goTo={state.goTo}
          />
        </>
      )}
      chapters={BRAIN_CHAPTERS}
      // The landing's words along the foot are its way between the screens, the way on above them.
      pager={false}
      footer="clamp(64px,9.5vh,88px)"
      stage={(chapter, colorSlot) => (
        <FadingStage
          scene={chapter.scene}
          wide={(scene) => scene === 'trio'}
          // The first screen, on its grid.
          full={(scene) => scene === 'opening'}
          // The first screen's fly brain, under its recording, is turned by hand through it.
          passThrough={(scene) => scene === 'opening'}
          draw={(scene, leaving) => (
            <BrainScene
              scene={scene}
              colorSlot={leaving || !chapter.colorBy ? null : colorSlot}
            />
          )}
        />
      )}
    />
  );
}

function BrainScene({ scene, colorSlot }: { scene: TBrainScene; colorSlot: HTMLElement | null }) {
  if (scene === 'opening') return <BrainsOpening />;
  if (scene === 'configuration') return <StageVideo video={CONFIGURATION_VIDEO} />;
  if (scene === 'multiplying') return <MultiplyingBrains />;
  if (scene === 'teaching') return <StageVideo video={TEACHING_VIDEO} />;
  if (scene === 'analysis') return <StageVideo video={ANALYSIS_VIDEO} />;
  if (scene === 'notebooks') return <NotebooksVideo />;
  // Getting started, beside the early adopters already on the platform.
  if (scene === 'join') return <EarlyAdopters />;
  // As the other walkthrough's first screen has it.
  if (scene === 'l6') return <ModelView model="l6" colorSlot={colorSlot} color={L6_COLOR} />;
  if (scene === 'trio') return <BrainTrio />;
  if (scene === 'fly') return <FlyInBrain colorSlot={colorSlot} />;
  if (scene === 'mouse') return <MouseInBrain colorSlot={colorSlot} />;
  if (scene === 'microns') return <MicronsCircuit colorSlot={colorSlot} />;
  return <HumanWithBrain />;
}
