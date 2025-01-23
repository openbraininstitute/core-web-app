/**
 * We try to have the smallest JSON file that describes the brain regions hierarchy.
 */

/**
 * @typedef {[id: string, name: string, children: StaticAtlas[]]} StaticAtlas
 *
 * @typedef {{
 *    id: string
 *    title: string
 *    colorCode: string
 *    items: BrainRegion[]
 * }} BrainRegion
 */

import nodeFS from 'node:fs';

/**
 * @param {BrainRegion} region
 * @returns {StaticAtlas}
 */
function convert(region) {
  return [region.id, region.title, region.items.map(convert)];
}

/** @type {BrainRegion} */
const input = JSON.parse(nodeFS.readFileSync('./brain-regions-hr.json').toString());

const output = convert(input[0]);
nodeFS.writeFileSync('./static-atlas.json', JSON.stringify(output));
