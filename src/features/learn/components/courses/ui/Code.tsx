'use client';

/**
 * Code as the courses show it: an editor's dark panel, whatever the page's
 * theme, with Python (or a shell command) coloured by a small tokenizer; and
 * what running it printed, plots included.
 */

import { Fragment, type ReactNode } from 'react';

/** The panel's colours — fixed, not the theme's: code reads best light on dark either way. */
export const INK = {
  text: '#e2e8f0',
  dim: '#94a3b8',
  faint: '#64748b',
  keyword: '#7dd3fc',
  builtin: '#c4b5fd',
  fn: '#6ee7b7',
  string: '#fcd34d',
  number: '#fda4af',
  comment: '#7c8aa3',
  error: '#fca5a5',
  line: 'rgba(125, 211, 252, 0.12)',
  rule: 'rgba(255, 255, 255, 0.08)',
  output: 'rgba(255, 255, 255, 0.035)',
};

const KEYWORDS = new Set(
  (
    'False None True and as assert async await break class continue def del elif else except finally for from ' +
    'global if import in is lambda nonlocal not or pass raise return try while with yield'
  ).split(' ')
);
const BUILTINS = new Set(
  (
    'print len range sum min max abs round int float str list dict set tuple enumerate zip sorted type isinstance ' +
    'open input any all map filter'
  ).split(' ')
);

type Kind = 'keyword' | 'builtin' | 'fn' | 'string' | 'number' | 'comment' | 'text' | 'dim';
interface Token {
  kind: Kind;
  text: string;
}

/** One line of Python as tokens — `open` says whether it starts inside a triple-quoted string, and returns whether it ends in one. */
function pythonLine(line: string, open: string | null): { tokens: Token[]; open: string | null } {
  const tokens: Token[] = [];
  let i = 0;
  if (open) {
    const end = line.indexOf(open);
    if (end < 0) return { tokens: [{ kind: 'string', text: line }], open };
    tokens.push({ kind: 'string', text: line.slice(0, end + 3) });
    i = end + 3;
  }
  const rules: [Kind | 'triple', RegExp][] = [
    ['comment', /#.*/y],
    ['triple', /[rRbBfFuU]{0,2}("""|''')/y],
    ['string', /[rRbBfFuU]{0,2}(["'])(?:\\.|(?!\1).)*\1/y],
    ['number', /(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?j?/y],
    ['text', /[A-Za-z_]\w*/y],
    ['dim', /\s+|./y],
  ];
  while (i < line.length) {
    for (const [kind, rule] of rules) {
      rule.lastIndex = i;
      const m = rule.exec(line);
      if (!m) continue;
      let text = m[0];
      if (kind === 'triple') {
        const quote = m[1];
        const end = line.indexOf(quote, i + text.length);
        if (end < 0) {
          tokens.push({ kind: 'string', text: line.slice(i) });
          return { tokens, open: quote };
        }
        text = line.slice(i, end + 3);
        tokens.push({ kind: 'string', text });
      } else if (kind === 'text') {
        const next = line.slice(i + text.length).match(/^\s*\(/);
        const k: Kind = KEYWORDS.has(text)
          ? 'keyword'
          : BUILTINS.has(text)
            ? 'builtin'
            : next
              ? 'fn'
              : 'text';
        tokens.push({ kind: k, text });
      } else tokens.push({ kind, text });
      i += text.length;
      break;
    }
  }
  return { tokens, open: null };
}

/** A shell line: a dim prompt, the command, its arguments. */
function shellLine(line: string): Token[] {
  const m = line.match(/^(\s*\$\s*)?(\S+)?(.*)$/);
  if (!m) return [{ kind: 'text', text: line }];
  return [
    { kind: 'dim', text: m[1] ?? '' },
    { kind: 'fn', text: m[2] ?? '' },
    { kind: 'text', text: m[3] ?? '' },
  ];
}

/** NMODL, the language NEURON's mechanisms are written in: its block and statement words, comments after a colon, units in brackets. */
const NMODL_WORDS = new Set(
  (
    'NEURON SUFFIX POINT_PROCESS USEION READ WRITE RANGE GLOBAL NONSPECIFIC_CURRENT PARAMETER STATE ASSIGNED ' +
    'BREAKPOINT SOLVE METHOD INITIAL DERIVATIVE PROCEDURE FUNCTION LOCAL UNITS TABLE DEPEND FROM TO WITH ' +
    'THREADSAFE KINETIC NET_RECEIVE if else'
  ).split(' ')
);
function nmodlLine(line: string): Token[] {
  const tokens: Token[] = [];
  const rules: [Kind | 'unit', RegExp][] = [
    ['comment', /:.*/y],
    ['unit', /\([A-Za-z0-9/]*\)/y],
    ['number', /(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/y],
    ['text', /[A-Za-z_]\w*'?/y],
    ['dim', /\s+|./y],
  ];
  let i = 0;
  while (i < line.length) {
    for (const [kind, rule] of rules) {
      rule.lastIndex = i;
      const m = rule.exec(line);
      // a unit only where it follows a space: `v (mV)`, not `rates(v)`
      if (!m || (kind === 'unit' && (i === 0 || line[i - 1] !== ' '))) continue;
      const text = m[0];
      if (kind === 'unit') tokens.push({ kind: 'comment', text });
      else if (kind === 'text') {
        const next = line.slice(i + text.length).match(/^\s*\(/);
        tokens.push({ kind: NMODL_WORDS.has(text) ? 'keyword' : next ? 'fn' : 'text', text });
      } else tokens.push({ kind, text });
      i += text.length;
      break;
    }
  }
  return tokens;
}

type Lang = 'python' | 'shell' | 'text' | 'nmodl';

/** The code, line by line, as coloured tokens. */
function tokenize(code: string, lang: Lang): Token[][] {
  const lines = code.split('\n');
  if (lang === 'shell') return lines.map(shellLine);
  if (lang === 'text') return lines.map((text) => [{ kind: 'text' as const, text }]);
  if (lang === 'nmodl') return lines.map(nmodlLine);
  let open: string | null = null;
  return lines.map((line) => {
    const r = pythonLine(line, open);
    open = r.open;
    return r.tokens;
  });
}

const colourOf = (kind: Kind) =>
  ({
    keyword: INK.keyword,
    builtin: INK.builtin,
    fn: INK.fn,
    string: INK.string,
    number: INK.number,
    comment: INK.comment,
    text: INK.text,
    dim: INK.dim,
  })[kind];

/** Coloured lines of code, each lit if listed in `lit` (1-based). */
export function Highlighted({
  code,
  lang = 'python',
  lit = [],
}: {
  code: string;
  lang?: Lang;
  lit?: number[];
}) {
  return (
    <>
      {tokenize(code, lang).map((tokens, k) => (
        <div
          key={k}
          className="-mx-4 min-h-[1.6em] px-4"
          style={{ background: lit.includes(k + 1) ? INK.line : undefined }}
        >
          {tokens.map((t, j) => (
            <span
              key={j}
              style={{
                color: colourOf(t.kind),
                fontStyle: t.kind === 'comment' ? 'italic' : undefined,
              }}
            >
              {t.text}
            </span>
          ))}
          {tokens.length === 0 && '​'}
        </div>
      ))}
    </>
  );
}

/** The editor's frame: a dark panel, a file name or label on its top bar, and what is in it. */
export function Panel({
  label,
  right,
  children,
  className = '',
  small = false,
}: {
  label?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Set smaller, for a long piece of code. */
  small?: boolean;
}) {
  const size = small
    ? 'text-[11.5px] leading-[1.55] sm:text-[12px]'
    : 'text-[13px] leading-[1.6] sm:text-[13.5px]';
  return (
    <div
      className={`overflow-hidden rounded-xl font-mono shadow-sm ${size} ${className}`}
      style={{ background: 'var(--screen)', color: INK.text }}
    >
      {(label || right) && (
        <div
          className="flex items-center justify-between gap-3 px-4 py-2 text-[11px] tracking-wide"
          style={{ borderBottom: `1px solid ${INK.rule}`, color: INK.faint }}
        >
          <span className="flex items-center gap-2">
            <span className="flex gap-1">
              {[0, 1, 2].map((k) => (
                <span key={k} className="h-2 w-2 rounded-full" style={{ background: INK.rule }} />
              ))}
            </span>
            {label}
          </span>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

/** Read-only code in its panel. */
export function CodeBlock({
  code,
  lang = 'python',
  lit,
  label,
  right,
  className,
  small,
}: {
  code: string;
  lang?: Lang;
  lit?: number[];
  label?: ReactNode;
  right?: ReactNode;
  className?: string;
  small?: boolean;
}) {
  return (
    <Panel label={label} right={right} className={className} small={small}>
      <pre className="overflow-x-auto px-4 py-3">
        <Highlighted code={code} lang={lang} lit={lit} />
      </pre>
    </Panel>
  );
}

/** A plot asked for from Python: one or more lines over shared axes. */
export interface Plot {
  x: number[];
  ys: number[][];
  labels?: string[];
  xlabel?: string;
  ylabel?: string;
  title?: string;
  /** Which lines are dashed: drawn over another, both show. */
  dashes?: boolean[];
}

/** What printing gave, split into plain text and the plots marked out in it. */
export function parseOutput(text: string): { text: string; plots: Plot[] } {
  const plots: Plot[] = [];
  const kept: string[] = [];
  for (const line of text.split('\n')) {
    if (line.startsWith('__plot__')) {
      try {
        plots.push(JSON.parse(line.slice(8)) as Plot);
      } catch {
        kept.push(line);
      }
    } else kept.push(line);
  }
  return { text: kept.join('\n').replace(/\n+$/, ''), plots };
}

const LINE_COLOURS = ['#7dd3fc', '#fda4af', '#6ee7b7', '#fcd34d'];

/** A plot drawn as SVG on the panel's dark ground: axes with a few ticks, and its lines. */
function PlotView({ plot, height = 170 }: { plot: Plot; height?: number }) {
  const [w, h] = [560, height];
  const pad = { l: 46, r: 12, t: plot.title ? 22 : 10, b: 30 };
  const xs = plot.x;
  const all = plot.ys.flat().filter((v) => Number.isFinite(v));
  if (!xs.length || !all.length) return null;
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  let [y0, y1] = [Math.min(...all), Math.max(...all)];
  if (y1 - y0 < 1e-9) [y0, y1] = [y0 - 1, y1 + 1];
  const margin = (y1 - y0) * 0.08;
  [y0, y1] = [y0 - margin, y1 + margin];
  const px = (x: number) => pad.l + ((x - x0) / (x1 - x0 || 1)) * (w - pad.l - pad.r);
  const py = (y: number) => pad.t + (1 - (y - y0) / (y1 - y0)) * (h - pad.t - pad.b);
  const ticks = (lo: number, hi: number, n: number) => {
    const step = 10 ** Math.floor(Math.log10((hi - lo) / n));
    const nice = [1, 2, 5, 10].map((k) => k * step).find((s) => (hi - lo) / s <= n) ?? step * 10;
    const out: number[] = [];
    for (let v = Math.ceil(lo / nice) * nice; v <= hi; v += nice)
      out.push(Number(v.toPrecision(10)));
    return out;
  };
  const fmt = (v: number) =>
    Math.abs(v) >= 1000 || (Math.abs(v) < 0.01 && v !== 0) ? v.toExponential(0) : String(v);
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full"
      role="img"
      aria-label={plot.title ?? 'A plot'}
    >
      {plot.title && (
        <text x={pad.l} y={14} fill={INK.dim} fontSize={11}>
          {plot.title}
        </text>
      )}
      {ticks(y0, y1, 4).map((v) => (
        <Fragment key={`y${v}`}>
          <line x1={pad.l} x2={w - pad.r} y1={py(v)} y2={py(v)} stroke={INK.rule} />
          <text x={pad.l - 6} y={py(v) + 3.5} fill={INK.faint} fontSize={10} textAnchor="end">
            {fmt(v)}
          </text>
        </Fragment>
      ))}
      {ticks(x0, x1, 6).map((v) => (
        <text
          key={`x${v}`}
          x={px(v)}
          y={h - pad.b + 14}
          fill={INK.faint}
          fontSize={10}
          textAnchor="middle"
        >
          {fmt(v)}
        </text>
      ))}
      <line
        x1={pad.l}
        x2={w - pad.r}
        y1={h - pad.b}
        y2={h - pad.b}
        stroke={INK.dim}
        strokeOpacity={0.5}
      />
      {plot.xlabel && (
        <text
          x={(pad.l + w - pad.r) / 2}
          y={h - 3}
          fill={INK.dim}
          fontSize={10.5}
          textAnchor="middle"
        >
          {plot.xlabel}
        </text>
      )}
      {plot.ylabel && (
        <text
          x={10}
          y={(pad.t + h - pad.b) / 2}
          fill={INK.dim}
          fontSize={10.5}
          textAnchor="middle"
          transform={`rotate(-90 10 ${(pad.t + h - pad.b) / 2})`}
        >
          {plot.ylabel}
        </text>
      )}
      {plot.ys.map((ys, k) => (
        <polyline
          key={k}
          fill="none"
          stroke={LINE_COLOURS[k % LINE_COLOURS.length]}
          strokeWidth={1.5}
          strokeDasharray={plot.dashes?.[k] ? '6 4' : undefined}
          strokeLinejoin="round"
          points={ys.map((y, i) => `${px(xs[i]).toFixed(1)},${py(y).toFixed(1)}`).join(' ')}
        />
      ))}
      {plot.labels?.map((label, k) => (
        <text
          key={label}
          x={w - pad.r - 4}
          y={pad.t + 12 + k * 14}
          fill={LINE_COLOURS[k % LINE_COLOURS.length]}
          fontSize={10.5}
          textAnchor="end"
        >
          {label}
        </text>
      ))}
    </svg>
  );
}

/** What running the code printed — and any plots — under it, on the same panel. */
export function OutputView({
  text,
  plots = [],
  error,
  beside = false,
}: {
  text: string;
  plots?: Plot[];
  error?: string | null;
  /** Beside the code, on a wide screen — its rule on its left — rather than under it. */
  beside?: boolean;
}) {
  if (!text && !plots.length && !error) return null;
  return (
    <div
      className={`px-4 py-3 ${beside ? 'md:flex md:flex-col md:justify-center' : ''}`}
      style={{
        background: INK.output,
        borderTop: `1px solid ${INK.rule}`,
        ...(beside ? { borderLeft: `1px solid ${INK.rule}` } : {}),
      }}
    >
      {text && (
        <pre className="overflow-x-auto whitespace-pre-wrap" style={{ color: INK.text }}>
          {text}
        </pre>
      )}
      {plots.map((p, k) => (
        <PlotView key={k} plot={p} />
      ))}
      {error && (
        <pre className="overflow-x-auto whitespace-pre-wrap" style={{ color: INK.error }}>
          {error}
        </pre>
      )}
    </div>
  );
}
