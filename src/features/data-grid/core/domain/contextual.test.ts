import { describe, expect, it } from 'vitest';

import {
  byContext,
  matchesRule,
  mergeContextual,
  resolveContextual,
  whenMatches,
} from './contextual';

import type { GridContext } from './grid-context';

const ctx = (over: Partial<GridContext> = {}): GridContext => ({
  dataType: 'cell_morphology',
  section: 'data',
  scope: 'project',
  species: 'all',
  ...over,
});

describe('whenMatches', () => {
  it('an omitted/empty clause always matches', () => {
    expect(whenMatches(undefined, ctx())).toBe(true);
    expect(whenMatches({}, ctx())).toBe(true);
  });

  it('AND-s keys, OR-s array values within a key', () => {
    expect(whenMatches({ section: 'data', scope: 'project' }, ctx())).toBe(true);
    expect(whenMatches({ section: 'data', scope: 'public' }, ctx())).toBe(false);
    expect(whenMatches({ section: ['data', 'build'] }, ctx())).toBe(true);
    expect(whenMatches({ section: ['build', 'explore'] }, ctx())).toBe(false);
  });

  it('an undefined value inside a clause does not constrain', () => {
    expect(whenMatches({ scope: undefined, section: 'data' }, ctx())).toBe(true);
  });

  it('matches on forward-compatible `factors` with no core change', () => {
    const c = ctx({ factors: { role: 'admin', beta: true } });
    expect(whenMatches({ role: 'admin' }, c)).toBe(true);
    expect(whenMatches({ role: 'viewer' }, c)).toBe(false);
    expect(whenMatches({ beta: true, section: 'data' }, c)).toBe(true);
    // known keys win over factors of the same name
    expect(whenMatches({ dataType: 'cell_morphology' }, ctx({ factors: { dataType: 'x' } }))).toBe(
      true
    );
  });
});

describe('matchesRule', () => {
  it('requires both the `when` clause and the imperative `matches` predicate', () => {
    const rule = {
      when: { section: 'data' },
      matches: (c: GridContext) => c.scope === 'project',
      value: 1,
    };
    expect(matchesRule(rule, ctx())).toBe(true);
    expect(matchesRule(rule, ctx({ scope: 'public' }))).toBe(false);
    expect(matchesRule(rule, ctx({ section: 'build' }))).toBe(false);
  });
});

describe('resolveContextual', () => {
  it('returns a constant unchanged', () => {
    expect(resolveContextual(true, ctx())).toBe(true);
    expect(resolveContextual(42, ctx())).toBe(42);
    expect(resolveContextual('x', ctx())).toBe('x');
  });

  it('calls a function form with the context (escape hatch)', () => {
    expect(resolveContextual((c) => c.scope === 'project', ctx())).toBe(true);
  });

  it('declarative: starts at default and the LAST matching rule wins', () => {
    const available = byContext<boolean>({
      default: false,
      rules: [
        { when: { section: 'data' }, value: true },
        { when: { section: 'data', scope: 'public' }, value: false },
      ],
    });
    expect(resolveContextual(available, ctx({ scope: 'project' }))).toBe(true);
    expect(resolveContextual(available, ctx({ scope: 'public' }))).toBe(false);
    expect(resolveContextual(available, ctx({ section: 'build' }))).toBe(false);
  });

  it('declarative default is undefined when omitted and nothing matches', () => {
    const v = byContext<number>({ rules: [{ when: { section: 'build' }, value: 5 }] });
    expect(resolveContextual(v, ctx())).toBeUndefined();
    expect(resolveContextual(v, ctx({ section: 'build' }))).toBe(5);
  });

  it('does not mistake a plain object value for a spec (brand required)', () => {
    // a bare {default,rules} object without the builder brand is treated as a constant
    const bare = { default: false, rules: [] } as unknown as boolean;
    expect(resolveContextual(bare, ctx())).toBe(bare);
  });
});

describe('mergeContextual', () => {
  it('returns the defined side when the other is missing', () => {
    expect(mergeContextual(true, undefined)).toBe(true);
    expect(mergeContextual(undefined, false)).toBe(false);
  });

  it('layers declarative rules (base first, override wins on conflict)', () => {
    const base = byContext<boolean>({
      default: true,
      rules: [{ when: { scope: 'public' }, value: false }],
    });
    const override = byContext<boolean>({
      rules: [{ when: { scope: 'public', section: 'data' }, value: true }],
    });
    const merged = mergeContextual(base, override) ?? true;
    // base hides in public…
    expect(resolveContextual(merged, ctx({ scope: 'public', section: 'build' }))).toBe(false);
    // …but the override re-enables it for public+data (evaluated after → wins)
    expect(resolveContextual(merged, ctx({ scope: 'public', section: 'data' }))).toBe(true);
  });

  it('a constant/function override replaces a declarative base outright', () => {
    const base = byContext<boolean>({ default: true });
    expect(mergeContextual(base, false)).toBe(false);
  });
});
