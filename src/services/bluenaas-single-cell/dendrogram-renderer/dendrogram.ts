'use client';

import { Group } from 'three';

import { NeuronSegementInfo } from '../renderer-utils';

import { buildCircularDendrogram } from './circular';
import { TreeNode } from './types';

export function buildDendrogram(
  tree: TreeNode,
  neuroSegmentInfo: Map<string, NeuronSegementInfo>
): Group {
  const group = new Group();
  buildCircularDendrogram(tree, group, neuroSegmentInfo);
  return group;
}

// function buildOrthoDendrogramRecursively(
//   tree: TreeNode,
//   group: Group,
//   neuroSegmentInfo: Map<string, NeuronSegementInfo>,
//   x = 0,
//   y = 0
// ) {
//   let currentY = y;
//   for (let segmentIndex = 0; segmentIndex < tree.segments.length; segmentIndex += 1) {
//     const segment = tree.segments[segmentIndex];
//     const mesh = createMesh(tree, segmentIndex, x, currentY);
//     const userData = neuroSegmentInfo.get(mesh.name);
//     if (userData) mesh.userData = userData;
//     else console.error('Not found userData for mesh:', mesh.name);
//     group.add(mesh);
//     currentY += segment.length;
//   }
//   tree.sections.forEach((child, index) => {
//     const nbSections = tree.sections.length;
//     const alpha = index / (nbSections - 1) - (nbSections > 1 ? 0.5 : 0);
//     const childX = x + tree.total_width * alpha;
//     buildOrthoDendrogramRecursively(child, group, neuroSegmentInfo, childX, currentY);
//     if (x !== childX) group.add(createLine(x, currentY, childX, currentY));
//   });
// }

// function createMesh(dendrogram: Dendrogram, segmentIndex: number, x: number, y: number) {
//   const segment = dendrogram.segments[segmentIndex];
//   const geometry = new CylinderGeometry(segment.diam, segment.diam, segment.length, 6, 1, true);
//   const material = new MeshLambertMaterial({
//     color: getSegmentColor(dendrogram.name),
//     side: DoubleSide,
//   });

//   const mesh = new Mesh(geometry, material);
//   const id = `${dendrogram.name}_${segmentIndex}`;
//   mesh.name = id;
//   mesh.position.set(x, y + segment.length / 2, 0);
//   return mesh;
// }
