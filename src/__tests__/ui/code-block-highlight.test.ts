import { describe, expect, it } from 'vitest';

import { highlightCode } from '@/ui/molecules/code-blocks';

import type { BundledLanguage } from 'shiki';

const HH_MOD = `TITLE hh.mod   squid sodium channel

COMMENT
 The original Hodgkin-Huxley treatment.
ENDCOMMENT

NEURON {
    SUFFIX hh
    USEION na READ ena WRITE ina
    THREADSAFE : assigned GLOBALs will be per thread
}

PARAMETER {
    gnabar = .12 (S/cm2) <0,1e9>
}

BREAKPOINT {
    SOLVE states METHOD cnexp
    ina = gna*(v - ena)
}

FUNCTION vtrap(x,y) {
    vtrap = x/(exp(x/y) - 1)
}
`;

function colourOf(html: string, token: string): string | undefined {
  const span = [...html.matchAll(/<span style="([^"]*)">([^<]*)<\/span>/g)].find((m) =>
    m[2].includes(token)
  );
  return span && /--shiki-light:(#[0-9A-Fa-f]{6})/.exec(span[1])?.[1];
}

describe('highlightCode', () => {
  it('highlights a language shiki bundles', async () => {
    const html = await highlightCode('{ "a": 1 }', 'json');

    expect(colourOf(html, 'a')).toBeDefined();
  });

  it('falls back to plain text rather than rejecting on an unknown language', async () => {
    const html = await highlightCode('some content', 'not-a-language' as BundledLanguage);

    expect(html).toContain('some content');
  });

  it('highlights NMODL, which shiki does not bundle', async () => {
    const html = await highlightCode(HH_MOD, 'mod' as BundledLanguage);
    const keyword = colourOf(html, 'NEURON');

    expect(keyword).toBeDefined();
    expect(colourOf(html, ': assigned GLOBALs')).not.toBe(keyword);
    expect(colourOf(html, 'ENDCOMMENT')).toBe(colourOf(html, ': assigned GLOBALs'));
    expect(colourOf(html, '(S/cm2)')).toBeDefined();
    expect(colourOf(html, '(S/cm2)')).not.toBe(keyword);
    expect(colourOf(html, 'SUFFIX')).not.toBe(keyword);
  });
});
