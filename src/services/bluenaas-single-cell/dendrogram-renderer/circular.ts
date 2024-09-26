import { Group } from 'three';

import { getSegmentColor } from '../colors';
import { NeuronSegementInfo } from '../renderer-utils';
import { createLine, createSoma, createSegment } from './create';
import { TreeNode } from './types';

export function buildCircularDendrogram(
  tree: TreeNode,
  group: Group,
  neuroSegmentInfo: Map<string, NeuronSegementInfo>
) {
  console.log('🚀 [circular] tree = ', tree); // @FIXME: Remove this line written on 2024-09-25 at 18:50
  const [parentX, parentY] = computeCoords(tree.value, tree.value.yMax);
  if (tree.value.yMin <= 0) {
    // This is the soma.
    const somaName = `${tree.value.name}_0`;
    group.add(
      createSoma(somaName, neuroSegmentInfo.get(somaName), tree.value.segments[0].diam / 2)
    );
  }
  for (const child of tree.children) {
    let [headX, headY] = computeCoords(child.value, child.value.yMin);
    group.add(createLine(parentX, parentY, headX, headY));
    let length = child.value.yMin;
    tree.value.segments.forEach((segment, segmentIndex) => {
      const name = `${child.value.name}_${segmentIndex}`;
      const userData = neuroSegmentInfo.get(name);
      length += segment.length;
      const [tailX, tailY] = computeCoords(child.value, length);
      const mesh = createSegment(headX, headY, tailX, tailY, getSegmentColor(name), segment.diam);
      mesh.name = name;
      if (userData) mesh.userData = userData;
      group.add(mesh);
      headX = tailX;
      headY = tailY;
    });
    buildCircularDendrogram(child, group, neuroSegmentInfo);
  }
}

function computeCoords(
  { xMin, xMax }: { xMin: number; xMax: number },
  radius: number
): [x: number, y: number] {
  const angle = (Math.PI * (xMin + xMax)) / 2;
  return [radius * Math.sin(angle), radius * Math.cos(angle)];
}
