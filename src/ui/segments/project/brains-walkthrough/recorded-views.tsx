'use client';

import { useQuery } from '@tanstack/react-query';
import { type RefObject, useEffect, useRef, useState } from 'react';

import { getAdoptersContent } from '@/content/website/shared';
import { optimizedMedia } from '@/ui/segments/landing/optimized-media';
import {
  useWalkthroughActions,
  useWalkthroughEntered,
} from '@/ui/segments/project/walkthrough/walkthrough';
import { cn } from '@/utils/css-class';

import getStarted from './get-started.module.css';
import labs from './virtual-labs.module.css';

/**
 * A simulation campaign being set up and generated on the Male CNS's LIF model, from the user's recording
 * "2. Simulation Configuration + Generation", its menu bar cropped, cut down to three moments of configuration at
 * 1.25x (10 s): naming the campaign, filtering a neuron set beside the 3D brain, then stimulus and recordings.
 */
export const CONFIGURATION_VIDEO = {
  src: optimizedMedia('/images/start/walkthrough/simulation-configuration.mp4'),
  poster: optimizedMedia('/images/start/walkthrough/simulation-configuration.jpg', 'poster'),
};

/**
 * The Virtual Labs screen's working video, straight cuts of the user's recordings: a neuron skeletonized, then a
 * simulation's results (harness/labs_video/make.sh in the home_page group, which lists them).
 */
export const VIRTUAL_LABS_VIDEO = {
  src: optimizedMedia('/images/start/walkthrough/virtual-labs.mp4'),
  poster: optimizedMedia('/images/start/walkthrough/virtual-labs.jpg', 'poster'),
};

/** A crisp platform recording with a soft shadow beneath it. */
export function VirtualLabsPreview({ near = true }: { near?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      if (preference.matches) {
        videoRef.current?.pause();
      }
    };
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);
  return (
    <figure data-chapter-media className={labs.preview}>
      <video
        ref={videoRef}
        src={near ? VIRTUAL_LABS_VIDEO.src : undefined}
        poster={VIRTUAL_LABS_VIDEO.poster}
        // Not autoPlay: the tour's playback starts it from the beginning once the intro is over, rather than it
        // playing on behind the intro and being sent back to its start as the screen comes in.
        preload="none"
        muted
        loop
        playsInline
        aria-label="Virtual Labs platform walkthrough"
        className={labs.video}
      />
    </figure>
  );
}

/** The recording of a simulation being set up, in a column of words, coming in once the intro is over. */
export function ConfigurationRecording({ className }: { className?: string }) {
  const entered = useWalkthroughEntered();
  return (
    <video
      src={CONFIGURATION_VIDEO.src}
      poster={CONFIGURATION_VIDEO.poster}
      autoPlay
      muted
      loop
      playsInline
      className={cn(
        labs.blendedVideo,
        'transition-opacity duration-700 ease-out',
        entered ? 'opacity-100' : 'opacity-0',
        className
      )}
    />
  );
}

const VIRTUAL_LABS_POINTS = [
  {
    title: 'Explore data across species',
    detail: 'Discover neurons, circuits and whole-brain models.',
  },
  {
    title: 'Build and simulate brain models',
    detail: 'Go from a scientific question to a simulation.',
  },
  {
    title: 'Share the results with your team',
    detail: 'Keep your data and discoveries in one shared lab.',
  },
];
/**
 * When the first point comes after the landing starts to leave, as the page comes to rest, and the gap to the next, ms.
 * For now, the three spread over the video's 9 s, not yet in time with what it shows.
 */
const POINTS_MS = { first: 1000, gap: 3000 };

/** What a Virtual Lab is for, as bullets coming one after another once the intro is over, and again if it comes back. */
export function VirtualLabsPoints() {
  const entered = useWalkthroughEntered();
  const actions = useWalkthroughActions();
  return (
    <div className={labs.content}>
      <p className={labs.introduction} data-chapter-introduction>
        A shared workspace for exploring, building and simulating the brain.
      </p>
      <ul className={labs.benefits}>
        {VIRTUAL_LABS_POINTS.map(({ title, detail }, i) => (
          <li
            key={title}
            className={labs.benefit}
            style={
              entered
                ? {
                    animation: `fade-in 600ms ease-out ${POINTS_MS.first + i * POINTS_MS.gap}ms both`,
                  }
                : { opacity: 0 }
            }
          >
            <p className={labs.benefitTitle}>{title}</p>
            <p className={labs.detail}>{detail}</p>
          </li>
        ))}
      </ul>
      <div className={labs.action} data-chapter-action>
        <button type="button" onClick={actions?.enter} className={labs.button}>
          Get Started
        </button>
      </div>
    </div>
  );
}

/** A classroom workshop on the platform, from the public homepage's tour (core-web-app#2032). */
export const TEACHING_VIDEO = {
  src: optimizedMedia('/images/start/walkthrough/education.mp4'),
  poster: optimizedMedia('/images/start/walkthrough/education-poster.jpg', 'poster'),
};

/** A moment of a stage video and what it shows, from `from` seconds into it. */
export type TVideoTitle = { from: number; text: string };

/**
 * Data and models explored, then a simulation's results, each cropped to its viewer: from the user's recordings,
 * the species on the data page (1.4 s), then 1.8 s each at 1.33-1.5x of a morphology coloured by distance turning,
 * single-cell electrophysiology, a MICrONS EM mesh zoomed into, Kv6.2 ion channel recordings and the Allen V1
 * circuit by layer turning; last 2.6 s of rasters, activity in 3D and PSTHs from the analysis recording. 13 s.
 */
export const ANALYSIS_VIDEO = {
  src: optimizedMedia('/images/start/walkthrough/explore-data-models.mp4'),
  poster: optimizedMedia('/images/start/walkthrough/explore-data-models.jpg', 'poster'),
  titles: [
    { from: 0, text: 'Explore multiple species data' },
    { from: 1.4, text: 'Neuron morphology' },
    { from: 3.2, text: 'Single-cell electrophysiology' },
    { from: 5.0, text: 'EM-reconstructed neuron · MICrONS' },
    { from: 6.8, text: 'Ion channel recordings · Kv6.2' },
    { from: 8.6, text: 'Circuit model · Allen V1' },
    { from: 10.4, text: 'Simulation results · rasters, 3D activity, PSTHs' },
  ],
};

/** A continuous band of customer logos, each linked to its organization. */
export function EarlyAdopters() {
  const { data: adopters = [] } = useQuery({
    queryKey: ['walkthrough', 'early-adopters'],
    queryFn: getAdoptersContent,
  });
  if (!adopters.length) return null;
  return (
    <div className={getStarted.customers}>
      <div className={getStarted.customerHeading}>
        <h2>Trusted by</h2>
      </div>
      <div className={getStarted.logoBand}>
        <div className={getStarted.logoTrack}>
          {[false, true].map((duplicate) => (
            <ul
              key={String(duplicate)}
              className={getStarted.logoGroup}
              aria-hidden={duplicate || undefined}
              inert={duplicate || undefined}
            >
              {adopters.map((adopter) => (
                <li key={adopter.name} className={getStarted.logoItem}>
                  <a
                    href={adopter.url || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={adopter.name}
                    className={getStarted.logoLink}
                  >
                    <span
                      role="img"
                      aria-label={adopter.name}
                      className={getStarted.logoMark}
                      style={{
                        maskImage: `url(${adopter.imageURL})`,
                        maskSize: 'contain',
                        maskRepeat: 'no-repeat',
                        maskPosition: 'center bottom',
                        WebkitMaskImage: `url(${adopter.imageURL})`,
                        WebkitMaskSize: 'contain',
                        WebkitMaskRepeat: 'no-repeat',
                        WebkitMaskPosition: 'center bottom',
                      }}
                    />
                  </a>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * A notebook opened from the platform's Notebooks page into JupyterLab: its code, then the interactive spine
 * viewer it builds. From the user's recording "notebooks", its first 3.6 s at 1.25x, the rest slowed to 7.2 s,
 * its frames interpolated. 10 s.
 */
export const NOTEBOOKS_VIDEO = {
  src: optimizedMedia('/images/start/walkthrough/notebooks.mp4'),
  poster: optimizedMedia('/images/start/walkthrough/notebooks.jpg', 'poster'),
};

/**
 * A recording across the stage beside a screen's words, in the middle of its height, or on the public tour level
 * with its title; `className` to place it otherwise. Away from `near`, only its poster: the page need not load
 * every film before one is seen.
 */
export function StageVideo({
  video,
  presentation = 'recording',
  near = true,
  className,
}: {
  video: { src: string; poster: string; titles?: readonly TVideoTitle[] };
  presentation?: 'recording' | 'animation';
  near?: boolean;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const title = useVideoTitle(videoRef, video.titles);
  const film = (
    <video
      ref={videoRef}
      src={near ? video.src : undefined}
      preload="none"
      poster={video.poster || undefined}
      autoPlay
      muted
      loop
      playsInline
      className={cn(
        labs.blendedVideo,
        labs.stageRecordingVideo,
        presentation === 'animation' && labs.animationVideo,
        video.titles && 'w-full!'
      )}
    />
  );
  return (
    <div
      data-chapter-media
      className={cn(
        'absolute top-[max(148px,18vh)] right-[24px] bottom-[max(100px,12vh)] left-0 flex items-center justify-center',
        // Upright, across the page, for a screen's words to start under it (`UNDER_VIDEO`).
        'stacked:inset-x-0 stacked:top-(--stage-video-top) stacked:bottom-auto stacked:h-(--stage-video-h)',
        className
      )}
    >
      {video.titles ? (
        // What each moment of the film shows, over its corner, the way the film's own frame holds it.
        <div className="relative mx-auto w-[88%]">
          {film}
          {title && (
            <p
              aria-live="polite"
              className="absolute bottom-[clamp(10px,1.6vw,20px)] left-[clamp(10px,1.6vw,20px)] rounded-full bg-[#002766]/88 px-[12px] py-[5px] text-[clamp(11px,0.95vw,14px)] leading-[1.3] font-medium text-white shadow-[0_4px_14px_rgba(0,39,102,0.2)]"
            >
              {title}
            </p>
          )}
        </div>
      ) : (
        film
      )}
    </div>
  );
}

/** The title of the moment a video is at, followed frame by frame while it plays. */
function useVideoTitle(
  videoRef: RefObject<HTMLVideoElement | null>,
  titles?: readonly TVideoTitle[]
) {
  const [title, setTitle] = useState(titles?.[0]?.text);
  useEffect(() => {
    const element = videoRef.current;
    if (!element || !titles?.length) return;
    const update = () => {
      const at = element.currentTime;
      setTitle(titles.findLast((moment) => moment.from <= at)?.text ?? titles[0].text);
    };
    update();
    element.addEventListener('timeupdate', update);
    return () => {
      element.removeEventListener('timeupdate', update);
    };
  }, [videoRef, titles]);
  return title;
}

/** One clear next step into the platform's sign-in and account creation flow. */
export function StartNow() {
  const actions = useWalkthroughActions();
  return (
    <div className="flex flex-col items-start gap-3 pt-[10px]" data-chapter-action>
      <button type="button" onClick={actions?.enter} className={labs.button}>
        Get Started
      </button>
      <small className="block text-[14px] leading-relaxed">
        Create your account, set up your Virtual Lab and begin.
      </small>
    </div>
  );
}
