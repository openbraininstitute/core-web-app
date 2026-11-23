/**
 * What the skeleton figure shows on a slide, as data: where the camera looks from, and how each
 * layer is drawn. No three.js here, so that the figure can say what it wants without loading it.
 */

/**
 * The camera's shots: four as cell.json frames them; 'pick', across the spine picked in the spine
 * table, and 'frame', round the chosen spine's way from its own frame to its place, both worked out
 * in the browser (`engine/shots.ts`).
 */
export type ShotName = 'whole' | 'soma' | 'dendrite' | 'spine' | 'pick' | 'frame';

/**
 * The membrane: hidden; opaque; as glass, its rims bright and its faces clear; or wiped, opaque left
 * of a line across the view and glass right of it, where the skeleton and spines show.
 */
export type MeshMode = 'off' | 'solid' | 'glass' | 'wipe';

/**
 * The skeleton's tubes and the soma: hidden; by SWC type; in one quiet colour; one section lit; or
 * each section its own colour, labelled with the id the spine table gives it.
 */
export type SkeletonMode = 'off' | 'type' | 'plain' | 'section' | 'sections';

/**
 * The spines: hidden; each its own colour; by distance along each spine from its dendrite; by
 * length; the chosen spine by distance along it, half see-through, the rest dimmed; the spines of
 * the chosen section lit; each in its section's colour; the picked spine lit and the rest dimmed;
 * or all dimmed and the chosen one left out, as its copy moves from its own frame to its place.
 */
export type SpineMode =
  | 'off'
  | 'each'
  | 'height'
  | 'length'
  | 'one'
  | 'section'
  | 'sections'
  | 'picked'
  | 'others';

/** The spine table drawn on the cell, a root, a centre and a direction per row: none, all, or the picked row's. */
export type MarkerMode = 'off' | 'all' | 'picked';

/** How the layers are drawn at a moment. */
export interface Layers {
  mesh: MeshMode;
  skeleton: SkeletonMode;
  spines: SpineMode;
  /** The chosen spine's own skeleton, its root and centre, and an arrow along its direction. */
  spineSkeleton: boolean;
  /** The spine table's rows on the cell. Off if not given. */
  markers?: MarkerMode;
  /** Every spine's own skeleton, as lines and points. Off if not given. */
  skeletons?: boolean;
  /** A copy of the chosen spine turning and moving from its own frame to its place, with its axes. */
  frame?: boolean;
}

/** A slide's view: a shot, the layers, and whether it turns. */
export interface ViewState extends Layers {
  shot: ShotName;
  spin: boolean;
  /**
   * Layers to cycle through in turn, each held a few seconds, instead of `Layers`' own: the
   * opening view's loop. With reduced motion, `Layers` stand still instead.
   */
  cycle?: readonly Layers[];
  /** The spine table's row picked, for the 'pick' shot, 'picked' spines and markers. */
  pick?: number;
}

/** Which of a cycle's layers are on show, for the legend: its index, or null without a cycle. */
export type Phase = number | null;

/**
 * The parts of the spiny H5 that the figure can light, each with what it draws: /edges the spine
 * table's rows, /morphology the skeleton, /soma/meshes the soma, /spines/meshes the spines' meshes,
 * /spines/skeletons their own skeletons.
 */
export type H5Part = 'edges' | 'morphology' | 'soma' | 'spine-meshes' | 'spine-skeletons';
