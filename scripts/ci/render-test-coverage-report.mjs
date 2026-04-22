#!/usr/bin/env node

import * as fs from 'node:fs';
import * as path from 'node:path';

const COMMENT_MARKER = '<!-- obi-test-coverage-report -->';
const REPORT_PATH = process.env.REPORT_PATH ?? 'test-coverage-report.md';
const UNIT_COVERAGE_SUMMARY_PATH =
  process.env.UNIT_COVERAGE_SUMMARY_PATH ?? 'test-artifacts/unit-coverage-summary.json';
const E2E_RESULTS_PATH = process.env.E2E_RESULTS_PATH ?? 'test-artifacts/e2e-results.json';
const E2E_METADATA_PATH = process.env.E2E_METADATA_PATH ?? 'test-artifacts/e2e-metadata.json';

function readJson(filePath) {
  const resolvedPath = resolveArtifactPath(filePath);
  return readJsonFile(resolvedPath);
}

function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function resolveArtifactPath(filePath) {
  if (fs.existsSync(filePath)) return filePath;

  const basename = path.basename(filePath);
  const roots = ['test-artifacts', 'artifacts'];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    const match = findFileByBasename(root, basename);
    if (match) return match;
  }

  return filePath;
}

function findFileByBasename(directory, basename) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isFile() && entry.name === basename) return entryPath;
    if (entry.isDirectory()) {
      const match = findFileByBasename(entryPath, basename);
      if (match) return match;
    }
  }
  return null;
}

function findArtifactFilesByPrefix(prefix) {
  const matches = [];
  const seen = new Set();
  const roots = ['test-artifacts', 'artifacts'];

  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(entryPath);
        continue;
      }
      if (entry.isFile() && entry.name.startsWith(prefix) && entry.name.endsWith('.json')) {
        const absolutePath = path.resolve(entryPath);
        if (!seen.has(absolutePath)) {
          seen.add(absolutePath);
          matches.push(entryPath);
        }
      }
    }
  }

  for (const root of roots) {
    if (fs.existsSync(root)) visit(root);
  }

  return matches.sort();
}

function formatStatus(status) {
  const labels = {
    success: 'Passed',
    failure: 'Failed',
    cancelled: 'Cancelled',
    skipped: 'Skipped',
  };
  return labels[status] ?? status ?? 'Unknown';
}

function formatPercent(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'n/a';
  return `${value.toFixed(2).replace(/\.00$/, '')}%`;
}

function formatDuration(ms) {
  if (typeof ms !== 'number' || Number.isNaN(ms)) return 'n/a';
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function countTestsFromSuites(suites = []) {
  const totals = {
    total: 0,
    passed: 0,
    failed: 0,
    flaky: 0,
    skipped: 0,
    timedOut: 0,
    interrupted: 0,
  };

  function normalizeStatus(test) {
    const finalResult = Array.isArray(test.results) ? test.results.at(-1) : undefined;
    const resultStatus = finalResult?.status;

    if (test.status === 'skipped' || resultStatus === 'skipped') return 'skipped';
    if (test.status === 'flaky') return 'flaky';
    if (resultStatus === 'timedOut') return 'timedOut';
    if (resultStatus === 'interrupted') return 'interrupted';
    if (test.status === 'unexpected' || resultStatus === 'failed') return 'failed';
    if (test.status === 'expected' || resultStatus === 'passed') return 'passed';
    return 'failed';
  }

  function visitSuite(suite) {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        totals.total += 1;
        totals[normalizeStatus(test)] += 1;
      }
    }
    for (const childSuite of suite.suites ?? []) {
      visitSuite(childSuite);
    }
  }

  for (const suite of suites) {
    visitSuite(suite);
  }

  return totals;
}

function summarizePlaywright(results) {
  if (!results) return null;

  const parsed = countTestsFromSuites(results.suites);
  const stats = results.stats ?? {};

  if (
    Number.isInteger(stats.expected) ||
    Number.isInteger(stats.unexpected) ||
    Number.isInteger(stats.flaky) ||
    Number.isInteger(stats.skipped)
  ) {
    const passed = Number(stats.expected ?? parsed.passed);
    const failed = Number(stats.unexpected ?? parsed.failed);
    const flaky = Number(stats.flaky ?? parsed.flaky);
    const skipped = Number(stats.skipped ?? parsed.skipped);
    return {
      total: passed + failed + flaky + skipped,
      passed,
      failed,
      flaky,
      skipped,
      timedOut: parsed.timedOut,
      interrupted: parsed.interrupted,
      durationMs: stats.duration ?? null,
    };
  }

  return {
    ...parsed,
    durationMs: stats.duration ?? null,
  };
}

function collectE2ERuns() {
  const resultFiles = findArtifactFilesByPrefix('e2e-results');

  if (resultFiles.length === 0) {
    const singleResult = readJson(E2E_RESULTS_PATH);
    if (!singleResult) return [];
    return [
      {
        summary: summarizePlaywright(singleResult),
        metadata: readJson(E2E_METADATA_PATH),
      },
    ].filter((run) => run.summary);
  }

  return resultFiles
    .map((resultPath) => {
      const resultFileName = path.basename(resultPath);
      const suffix = resultFileName.slice('e2e-results'.length);
      const metadataPath = path.join(path.dirname(resultPath), `e2e-metadata${suffix}`);

      return {
        summary: summarizePlaywright(readJsonFile(resultPath)),
        metadata: readJsonFile(metadataPath),
      };
    })
    .filter((run) => run.summary);
}

function aggregateE2ERuns(runs) {
  return runs.reduce(
    (totals, run) => {
      totals.total += run.summary.total;
      totals.passed += run.summary.passed;
      totals.failed += run.summary.failed;
      totals.flaky += run.summary.flaky;
      totals.skipped += run.summary.skipped;
      totals.timedOut += run.summary.timedOut;
      totals.interrupted += run.summary.interrupted;
      totals.durationMs += run.summary.durationMs ?? 0;
      return totals;
    },
    {
      total: 0,
      passed: 0,
      failed: 0,
      flaky: 0,
      skipped: 0,
      timedOut: 0,
      interrupted: 0,
      durationMs: 0,
    }
  );
}

function formatE2ETarget(metadata) {
  const os = metadata?.os ?? 'unknown-os';
  const browser = metadata?.browserLabel ?? metadata?.browser ?? 'unknown-browser';
  return `${os} / ${browser}`;
}

function renderUnitCoverage(summary, jobStatus) {
  const lines = [`### Unit Tests`, '', `Status: **${formatStatus(jobStatus)}**`, ''];

  if (!summary?.total) {
    lines.push(`No Vitest coverage summary found at \`${UNIT_COVERAGE_SUMMARY_PATH}\`.`);
    return lines;
  }

  const metrics = [
    ['Statements', summary.total.statements],
    ['Branches', summary.total.branches],
    ['Functions', summary.total.functions],
    ['Lines', summary.total.lines],
  ];

  lines.push('| Metric | Covered | Total | Coverage |');
  lines.push('| --- | ---: | ---: | ---: |');
  for (const [label, metric] of metrics) {
    lines.push(
      `| ${label} | ${metric.covered ?? 'n/a'} | ${metric.total ?? 'n/a'} | ${formatPercent(
        metric.pct
      )} |`
    );
  }

  return lines;
}

function renderE2ESummary(runs, jobStatus) {
  const lines = [`### E2E Tests`, '', `Status: **${formatStatus(jobStatus)}**`, ''];

  if (runs.length === 0) {
    lines.push(`No Playwright JSON reports found at \`${E2E_RESULTS_PATH}\`.`);
    return lines;
  }

  lines.push('| Target | Total | Passed | Failed | Flaky | Skipped | Workers | Duration |');
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
  for (const run of runs) {
    lines.push(
      `| ${formatE2ETarget(run.metadata)} | ${run.summary.total} | ${run.summary.passed} | ${
        run.summary.failed
      } | ${run.summary.flaky} | ${run.summary.skipped} | ${
        run.metadata?.workers ?? 'n/a'
      } | ${formatDuration(run.summary.durationMs)} |`
    );
  }

  const totals = aggregateE2ERuns(runs);
  lines.push('');
  lines.push(
    `Overall: **${totals.passed}/${totals.total} passed**` +
      `, **${totals.failed} failed**, **${totals.flaky} flaky**, **${totals.skipped} skipped**.`
  );
  lines.push(`Aggregate duration: **${formatDuration(totals.durationMs)}**`);

  return lines;
}

const unitCoverage = readJson(UNIT_COVERAGE_SUMMARY_PATH);
const e2eRuns = collectE2ERuns();

const lines = [
  COMMENT_MARKER,
  '## Test Coverage',
  '',
  `Commit: \`${(process.env.GITHUB_SHA ?? 'unknown').slice(0, 12)}\``,
  '',
  ...renderUnitCoverage(unitCoverage, process.env.UNIT_JOB_STATUS),
  '',
  ...renderE2ESummary(e2eRuns, process.env.E2E_JOB_STATUS),
  '',
];

fs.mkdirSync(path.dirname(path.resolve(REPORT_PATH)), { recursive: true });
fs.writeFileSync(REPORT_PATH, `${lines.join('\n')}\n`);
