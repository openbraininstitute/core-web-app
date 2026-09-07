import type { LanguageRegistration } from 'shiki';

const BLOCKS = [
  'TITLE',
  'NEURON',
  'UNITS',
  'PARAMETER',
  'ASSIGNED',
  'STATE',
  'INITIAL',
  'BREAKPOINT',
  'DERIVATIVE',
  'KINETIC',
  'LINEAR',
  'NONLINEAR',
  'DISCRETE',
  'NET_RECEIVE',
  'BEFORE',
  'AFTER',
  'CONSTRUCTOR',
  'DESTRUCTOR',
  'INDEPENDENT',
  'CONSTANT',
  'DEFINE',
  'INCLUDE',
  'LOCAL',
  'UNITSON',
  'UNITSOFF',
  'TABLE',
  'DEPEND',
  'FUNCTION_TABLE',
].join('|');

const DECLARATIONS = [
  'SUFFIX',
  'POINT_PROCESS',
  'ARTIFICIAL_CELL',
  'USEION',
  'READ',
  'WRITE',
  'VALENCE',
  'RANGE',
  'GLOBAL',
  'POINTER',
  'BBCOREPOINTER',
  'RANDOM',
  'NONSPECIFIC_CURRENT',
  'ELECTRODE_CURRENT',
  'THREADSAFE',
  'REPRESENTS',
].join('|');

const CONTROL = [
  'if',
  'else',
  'while',
  'for',
  'return',
  'break',
  'SOLVE',
  'METHOD',
  'STEADYSTATE',
  'FROM',
  'TO',
  'WITH',
  'WATCH',
  'CONSERVE',
  'COMPARTMENT',
  'at_time',
  'net_send',
  'net_event',
  'net_move',
].join('|');

/** Grammar for NEURON `.mod` files. Shiki has none, and no other language fits: `:` starts a
 * comment and `(mV)` is a unit, not a call. */
export const nmodl: LanguageRegistration = {
  name: 'mod',
  scopeName: 'source.nmodl',
  aliases: ['nmodl'],
  repository: {},
  patterns: [
    {
      name: 'comment.block.nmodl',
      begin: '\\bCOMMENT\\b',
      end: '\\bENDCOMMENT\\b',
    },
    { name: 'comment.line.colon.nmodl', match: '[:?].*$' },
    {
      name: 'string.quoted.double.nmodl',
      begin: '"',
      end: '"',
    },
    {
      match: `\\b(FUNCTION|PROCEDURE)\\s+([A-Za-z_]\\w*)`,
      captures: {
        1: { name: 'keyword.other.nmodl' },
        2: { name: 'entity.name.function.nmodl' },
      },
    },
    { name: 'keyword.other.nmodl', match: `\\b(${BLOCKS})\\b` },
    { name: 'support.function.nmodl', match: `\\b(${DECLARATIONS})\\b` },
    { name: 'keyword.control.nmodl', match: `\\b(${CONTROL})\\b` },
    // a unit follows a space; a call's arguments do not
    { name: 'support.type.unit.nmodl', match: '(?<=\\s)\\([^()\\n]*\\)' },
    {
      name: 'constant.numeric.nmodl',
      match: '\\b\\d+(\\.\\d*)?([eE][-+]?\\d+)?\\b|(?<![\\w.])\\.\\d+([eE][-+]?\\d+)?',
    },
  ],
};
