/* eslint-disable @typescript-eslint/no-loop-func */
import { StaticAtlas } from './static-atlas';

type Tree = [id: string, name: string, children: Tree[]];

const TEST_TREE: Tree = [
  'Root',
  'The root',
  [
    ['A', 'Albero', []],
    [
      'B',
      'Bianco',
      [
        ['B/r', 'Red', []],
        ['B/g', 'Green', []],
        ['B/b', 'Blue', []],
      ],
    ],
    [
      'C',
      'Cinepresa',
      [
        ['C/a', 'Vecchia', []],
        [
          'C/b',
          'Nuova',
          [
            ['cam1', 'Bella camera da salotto', []],
            ['cam2', 'Facile da trasportare', []],
          ],
        ],
      ],
    ],
  ],
];
describe(`StaticAtlas`, () => {
  function make(tree: Tree = TEST_TREE) {
    return StaticAtlas.getInstance(tree);
  }

  it(`should get region by id`, async () => {
    const atlas = await make();
    expect(atlas.getRegionById('B/g')?.name).toBe('Green');
  });
  it(`should get undefined if region id does not exist`, async () => {
    const atlas = await make();
    expect(atlas.getRegionById('Id that does not exist')).toBeUndefined();
  });

  it(`should get region by name`, async () => {
    const atlas = await make();
    expect(atlas.getRegionByName('nuova')?.id).toBe('C/b');
  });
  it(`should get undefined if region name does not exist`, async () => {
    const atlas = await make();
    expect(atlas.getRegionByName('Name that does not exist')).toBeUndefined();
  });

  describe(`family`, () => {
    const cases: Array<[candidate: string, member: string, expected: boolean]> = [
      ['C/a', 'C', true],
      ['C/b', 'C', true],
      ['Root', 'C', true],
      ['Root', 'C/b', true],
      ['Root', 'cam2', true],
      ['C/a', 'cam2', false],
    ];
    for (const [candidate, member, expected] of cases) {
      if (expected) {
        it(`should say "${candidate}" is family of "${member}"`, async () => {
          const atlas = await make();
          expect(atlas.isFamilyOf(candidate, member)).toBe(true);
        });
      } else {
        it(`should say "${candidate}" is NOT family of "${member}"`, async () => {
          const atlas = await make();
          expect(atlas.isFamilyOf(candidate, member)).toBe(false);
        });
      }
    }
  });
});
