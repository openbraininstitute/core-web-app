'use client';

/**
 * The thalamic reticular course's figure: real reticular neurons, reconstructed
 * whole, drawn as the brain-modeling course draws its ten — floating on white,
 * side by side, each turning, each named.
 */

import { ReticularGallery } from '@/features/learn/components/heuristics/real3d/Wet3D';

export const RETICULAR_STEPS = ['cells'] as const;
export type ReticularStep = (typeof RETICULAR_STEPS)[number];

export default function ReticularFigure({ back = false }: { step: ReticularStep; back?: boolean }) {
  return <ReticularGallery back={back} />;
}
