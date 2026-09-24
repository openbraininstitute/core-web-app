#!/usr/bin/env node

import * as fs from 'node:fs';
import * as path from 'node:path';

const COMMENT_MARKER = '<!-- obi-test-coverage-report -->';
const REPORT_PATH = process.env.REPORT_PATH ?? 'test-coverage-report.md';
const UNIT_COVERAGE_SUMMARY_PATH =
  process.env.UNIT_COVERAGE_SUMMARY_PATH ?? 'test-artifacts/unit-coverage-summary.json';

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

const unitCoverage = readJson(UNIT_COVERAGE_SUMMARY_PATH);

const lines = [
  COMMENT_MARKER,
  '## Test Coverage',
  '',
  `Commit: \`${(process.env.GITHUB_SHA ?? 'unknown').slice(0, 12)}\``,
  '',
  ...renderUnitCoverage(unitCoverage, process.env.UNIT_JOB_STATUS),
  '',
];

fs.mkdirSync(path.dirname(path.resolve(REPORT_PATH)), { recursive: true });
fs.writeFileSync(REPORT_PATH, `${lines.join('\n')}\n`);
