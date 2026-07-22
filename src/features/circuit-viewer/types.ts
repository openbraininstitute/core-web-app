import { z } from 'zod';

export const NodeSchema = z.object({
  morphology_file: z.string(),
  morphology_name: z.string(),
  position: z.tuple([z.number(), z.number(), z.number()]),
  orientation: z.tuple([z.number(), z.number(), z.number(), z.number()]),
});

export const NodesSchema = z.array(NodeSchema);

export enum MorphoViewerTreeItemType {
  Soma = 0,
  Dendrite,
  BasalDendrite,
  ApicalDendrite,
  Myelin,
  Axon,
  Selected,
  Liaison,
  Unknown,
}

const Point3DSchema = z.tuple([z.number(), z.number(), z.number()]);

export const SectionSchema = z.object({
  id: z.string(),
  parent_id: z.string().nullable(),
  type: z.enum(MorphoViewerTreeItemType),
  points: z.array(Point3DSchema),
  radii: z.array(z.number()),
});

export const SectionsArraySchema = z.array(SectionSchema);
export type Sections = z.infer<typeof SectionsArraySchema>;

export type Node = z.infer<typeof NodeSchema>;
export type Nodes = z.infer<typeof NodesSchema>;

export type Cell = {
  id: string;
  center: [number, number, number];
  orientation: [number, number, number, number];
  somaRadius: number;
  color: string;
};

export interface MorphoViewerTreeItem {
  x: number;
  y: number;
  z: number;
  radius: number;
  type: MorphoViewerTreeItemType;
  sectionId: string;
  segmentId: string;
  distanceFromSoma: number;
  children?: MorphoViewerTreeItem[];
}
