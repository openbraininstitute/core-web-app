import { TypeDef, assertType, ensureType, isType } from '.';

const isNeverMyType = (_data: unknown) => false;

describe('@tolokoban/type-guards', () => {
  describe('assertType()', () => {
    const itShouldThrow = (data: unknown, type: TypeDef, expectedErrorMessage?: string) => {
      it(`should throw for ${JSON.stringify(data)} with ${JSON.stringify(type)}`, () => {
        expect(() => assertType(data, type)).toThrow(expectedErrorMessage);
      });
    };
    const itShouldNotThrow = (data: unknown, type: TypeDef) => {
      it(`should NOT throw for ${JSON.stringify(data)} with ${JSON.stringify(type)}`, () => {
        expect(() => assertType(data, type)).not.toThrow();
      });
    };
    describe(`"undefined"`, () => {
      itShouldNotThrow(undefined, 'undefined');
      itShouldThrow(null, 'undefined', 'Expected data to be a undefined and not a null!');
    });
    describe(`["custom", (data: unknown) => boolean]`, () => {
      itShouldThrow(
        true,
        ['custom', isNeverMyType],
        'Expected isNeverMyType(data) to return true!'
      );
      const oddString: TypeDef = [
        'custom',
        (data: unknown) => typeof data === 'string' && data.length % 2 === 1,
      ];
      const cases: Array<[input: unknown, expected: boolean]> = [
        [36, false],
        ['Toto', false],
        ['foo', true],
      ];
      for (const [input, expected] of cases) {
        // eslint-disable-next-line @typescript-eslint/no-loop-func
        it(`should custom check ${JSON.stringify(input)}`, () => {
          expect(isType(input, oddString)).toBe(expected);
        });
      }
    });
    describe(`"boolean"`, () => {
      itShouldNotThrow(true, 'boolean');
      itShouldNotThrow(false, 'boolean');
      itShouldThrow(1, 'boolean', 'Expected data to be a boolean and not a number!');
      itShouldThrow('1', 'boolean', 'Expected data to be a boolean and not a string!');
    });
    describe(`"number"`, () => {
      itShouldNotThrow(3.14, 'number');
      itShouldThrow('3.14', 'number', 'Expected data to be a number and not a string!');
    });
    describe(`"string"`, () => {
      itShouldNotThrow('Hello', 'string');
      itShouldNotThrow('', 'string');
      itShouldThrow(3.14, 'string', 'Expected data to be a string and not a number!');
    });
    describe(`"null"`, () => {
      itShouldNotThrow(null, 'null');
      itShouldThrow(undefined, 'null', 'Expected data to be a null and not a undefined!');
      itShouldThrow(
        isNeverMyType,
        'null',
        'Expected data to be a null and not a function isNeverMyType()!'
      );
    });
    describe(`["tuples", ...]`, () => {
      itShouldNotThrow([6, 8], ['tuple', 'number', 'number']);
      itShouldNotThrow([6, 8, 1, 2, 3], ['tuple', 'number', 'number']);
      itShouldNotThrow([6, 'six', 8, 'eight'], ['tuple', 'number', 'string', 'number', 'string']);
      itShouldThrow(
        [6, 'six', 8],
        ['tuple', 'number', 'string', 'number', 'string'],
        "Expected data's length to be at least 4 and not 3!"
      );
      itShouldThrow(
        [6, 'siz', '8', 'eight'],
        ['tuple', 'number', 'string', 'number', 'string'],
        'Expected data[2] to be a number and not a string!'
      );
    });
    describe(`["tuples...", ...]`, () => {
      itShouldNotThrow(['burlp', 6, 8], ['tuple...', 'string', 'number']);
      itShouldNotThrow(['burlp', 6, 8, 1, 2, 3], ['tuple', 'string', 'number']);
      itShouldNotThrow(['burlp', true, 6, 8, 10], ['tuple...', 'string', 'boolean', 'number']);
      itShouldThrow(
        ['burlp', 6, 8, 10],
        ['tuple...', 'string', 'boolean', 'number'],
        'Expected data[1] to be a boolean and not a number!'
      );
      itShouldThrow(
        ['burlp', false, 6, 8, 10, 'bug', 5, 8],
        ['tuple...', 'string', 'boolean', 'number'],
        'Expected data[5] to be a number and not a string!'
      );
    });
    describe(`["array", ...]`, () => {
      itShouldNotThrow([], ['array', 'number']);
      itShouldNotThrow([1, 2, 3, 4, 5], ['array', 'number']);
      itShouldNotThrow([true, false, true], ['array', 'boolean']);
      itShouldThrow(
        [1, 2, 3, '4', 5],
        ['array', 'number'],
        'Expected data[3] to be a number and not a string!'
      );
      itShouldThrow([], ['array', 'number', 3], "Expected data's length to be 3 and not 0!");
      itShouldThrow(
        [1, 2, 3, 4, 5],
        ['array', 'number', 3],
        "Expected data's length to be 3 and not 5!"
      );
      itShouldThrow(
        [],
        ['array', 'number', { min: 3 }],
        "Expected data's MIN length to be 3 and not 0!"
      );
      itShouldNotThrow([1, 2, 3, 4, 5], ['array', 'number', { min: 3 }]);
      itShouldNotThrow([], ['array', 'number', { max: 3 }]);
      itShouldThrow(
        [1, 2, 3, 4, 5],
        ['array', 'number', { max: 3 }],
        "Expected data's MAX length to be 3 and not 5!"
      );
    });
    describe(`{...}`, () => {
      itShouldThrow({}, { name: 'string' });
      itShouldNotThrow({ name: 'Paula' }, { name: 'string' });
      itShouldThrow(
        { name: 666 },
        { name: 'string' },
        'Expected data.name to be a string and not a number!'
      );
      itShouldThrow(
        { name: 'Martha' },
        { name: 'string', age: 'number' },
        'Expected data.age to be a number and not a undefined!'
      );
    });
    describe(`["partial", {...}]`, () => {
      itShouldNotThrow({}, [
        'partial',
        {
          name: 'string',
        },
      ]);
      itShouldNotThrow({ name: 'William' }, [
        'partial',
        {
          name: 'string',
          age: 'number',
        },
      ]);
      itShouldNotThrow({ age: 21 }, [
        'partial',
        {
          name: 'string',
        },
      ]);
      itShouldThrow(
        { name: 666 },
        [
          'partial',
          {
            name: 'string',
          },
        ],
        'Expected data.name to be a string and not a number!'
      );
    });
    describe(`["literal", ...]`, () => {
      itShouldNotThrow('cherry', ['literal', 'ananas', 'banaba', 'cherry', 'dattes']);
      itShouldThrow(
        'prout',
        ['literal', 'ananas', 'banaba', 'cherry', 'dattes'],
        'Expected data to be a literal ("ananas" | "banaba" | "cherry" | "dattes") and not a string ("prout")!'
      );
    });
  });
  describe('ensureType()', () => {
    describe('defaultValue', () => {
      it(`should return the value`, () => {
        expect(ensureType(true, 'boolean', 666)).toBe(true);
      });
      it(`should return defaultValue`, () => {
        expect(ensureType<number>('Blob', 'number', 666)).toBe(666);
      });
      it(`should convert old version`, () => {
        expect(
          ensureType('true', 'boolean', (v) => {
            if (v === 'true') return true;
            return false;
          })
        ).toBe(true);
      });
    });
  });
  describe(`Recursivity`, () => {
    const tree: TypeDef = () => ({
      name: 'string',
      children: ['?', ['array', tree]],
    });
    it(`should validate this tree`, () => {
      const data = {
        name: 'root',
        chidren: [{ name: 'end' }, { name: 'next', children: [{ name: 'grand-child' }] }],
      };
      expect(isType(data, tree));
    });
  });
});
