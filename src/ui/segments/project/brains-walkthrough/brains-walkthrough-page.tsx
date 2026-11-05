'use client';

import { LivingHero } from '@/ui/segments/landing/living-hero';
import { OriginalHomePage } from '@/ui/segments/project/original-home';
import { FadingStage } from '@/ui/segments/project/walkthrough/stage';
import { Walkthrough } from '@/ui/segments/project/walkthrough/walkthrough';

import { AgentReady } from './agent-ready';
import {
  ANALYSIS_VIDEO,
  BrainsOpening,
  CONFIGURATION_VIDEO,
  EarlyAdopters,
  NotebooksVideo,
  StageVideo,
  TEACHING_VIDEO,
  VirtualLabsPreview,
} from './brain-views';
import { CNS_ON_FIRST_SCREEN } from './brains';
import {
  BRAIN_CHAPTERS,
  BRAIN_INTRO,
  BRAIN_THEME_LINKS,
  BRAIN_THEME_UNDERLINES,
  SERIF_TITLE,
} from './chapters';
import { CnsBackdrop, FloatingMaleCns, FloatingMicrocircuit } from './floating-model';
import { LandingThemes, ThemeNav } from './landing-themes';
import { ModelMosaic } from './model-mosaic';
import { MultiplyingBrains } from './multiplying-brains';

import type { TBrainScene } from './chapters';

/** How long the landing stands once its words are out before the page scrolls on by itself, ms. */
const LANDING_STAY_MS = 4000;
/** The analysis screen, behind which the Male CNS turns. */
const ANALYSIS_AT = BRAIN_CHAPTERS.findIndex((chapter) => chapter.scene === 'analysis');
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
      // On to the first screen by itself, but not ahead of the fly, whose walk takes longer.
      introStay={walking ? undefined : LANDING_STAY_MS}
      introContent={
        enterHref
          ? (actions) => <LivingHero onContinue={actions.continue} onChapter={actions.goTo} />
          : undefined
      }
      // The microcircuit, and the Male CNS where it is the landing's alone: neither would be seen again.
      introFloats={CNS_ON_FIRST_SCREEN ? 1 : 2}
      // The first screen's title, as the intro's words rise into it.
      firstTitleClass={SERIF_TITLE}
      // In-app, the home as main has it is uncovered as it ends; on the landing, Enter leads to the app.
      end="main"
      enterHref={enterHref}
      endUnder={enterHref ? undefined : <OriginalHomePage />}
      floating={(state) => (
        <>
          {(!enterHref || state.entered) && <FloatingMicrocircuit {...state} />}
          {(!enterHref || state.entered) && <FloatingMaleCns {...state} walking={walking} />}
          <CnsBackdrop {...state} at={ANALYSIS_AT} />
          {(!enterHref || state.entered) && (
            <ThemeNav
              entered={state.entered}
              chapter={state.chapter}
              underlines={BRAIN_THEME_UNDERLINES}
              links={BRAIN_THEME_LINKS}
              goTo={state.goTo}
              playback={enterHref ? state.playback : undefined}
            />
          )}
        </>
      )}
      chapters={
        enterHref
          ? BRAIN_CHAPTERS.map((chapter, index) =>
              index === 0
                ? { ...chapter, kicker: 'The era of brain simulation has arrived. For everyone.' }
                : chapter
            )
          : BRAIN_CHAPTERS
      }
      // The landing's words along the foot are its way between the screens, the way on above them.
      pager={false}
      footer="clamp(64px,9.5vh,88px)"
      stage={(chapter) => (
        <FadingStage
          scene={chapter.scene}
          // The first screen, on its grid.
          full={(scene) => CNS_ON_FIRST_SCREEN && scene === 'opening'}
          // The first screen's fly brain, under its recording, is turned by hand through it.
          passThrough={(scene) => CNS_ON_FIRST_SCREEN && scene === 'opening'}
          draw={(scene) => <BrainScene scene={scene} />}
        />
      )}
    />
  );
}

/** A screen's stage. Its models are drawn from packs in the repo, the same signed in or not. */
function BrainScene({ scene }: { scene: TBrainScene }) {
  if (scene === 'opening') {
    return CNS_ON_FIRST_SCREEN ? <BrainsOpening /> : <VirtualLabsPreview />;
  }
  if (scene === 'configuration') return <StageVideo video={CONFIGURATION_VIDEO} />;
  if (scene === 'multiplying') return <MultiplyingBrains />;
  if (scene === 'teaching') return <StageVideo video={TEACHING_VIDEO} />;
  if (scene === 'analysis') return <StageVideo video={ANALYSIS_VIDEO} />;
  if (scene === 'notebooks') return <NotebooksVideo />;
  if (scene === 'models') return <ModelMosaic />;
  // Getting started, beside the early adopters already on the platform.
  if (scene === 'join') return <EarlyAdopters />;
  return null;
}
