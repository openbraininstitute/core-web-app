import { Group } from 'three';

import { getSegmentColor } from '../colors';
import { NeuronSegementInfo } from '../renderer-utils';
import { createLine, createSoma, createSegment } from './create';
import { TreeNode } from './types';

export function buildClassicalDendrogram(
  tree: TreeNode,
  group: Group,
  neuroSegmentInfo: Map<string, NeuronSegementInfo>,
  spaceWidth: number
) {
  const [parentX, parentY] = computeCoords(tree.value, tree.value.yMax, spaceWidth);
  if (tree.value.yMin <= 0) {
    // This is the soma.
    for (let segmentIndex = 0; segmentIndex < tree.value.segments.length; segmentIndex += 1) {
      const { diam } = tree.value.segments[segmentIndex];
      const somaName = `${tree.value.name}_${segmentIndex}`;
      group.add(createSoma(somaName, neuroSegmentInfo.get(somaName), diam / 2));
    }
  }
  for (const child of tree.children) {
    let [headX, headY] = computeCoords(child.value, child.value.yMin, spaceWidth);
    group.add(createLine(parentX, parentY, headX, headY));
    let length = child.value.yMin;
    tree.value.segments.forEach((segment, segmentIndex) => {
      const name = `${child.value.name}_${segmentIndex}`;
      const userData = neuroSegmentInfo.get(name);
      length += segment.length;
      const [tailX, tailY] = computeCoords(child.value, length, spaceWidth);
      const mesh = createSegment(headX, headY, tailX, tailY, getSegmentColor(name), segment.diam);
      mesh.name = name;
      if (userData) mesh.userData = userData;
      group.add(mesh);
      headX = tailX;
      headY = tailY;
    });
    buildClassicalDendrogram(child, group, neuroSegmentInfo, spaceWidth);
  }
}

function computeCoords(
  { xMin, xMax }: { xMin: number; xMax: number },
  y: number,
  spaceWidth: number
): [x: number, y: number] {
  return [(spaceWidth * (xMin + xMax)) / 4, y];
}
