#!/usr/bin/env node

import * as fs from 'node:fs';
import * as path from 'node:path';

const resultPath = process.env.PLAYWRIGHT_JSON_OUTPUT_NAME;
const outputPath = process.env.E2E_FAILED_TEST_LOG_PATH;

function stripAnsi(value) {
  return String(value ?? '');
}

function formatDuration(ms) {
  if (typeof ms !== 'number' || Number.isNaN(ms)) return 'n/a';
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function normalizeTextEntries(entries = []) {
  return entries
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      if (typeof entry?.text === 'string') return entry.text;
      if (typeof entry?.buffer === 'string')
        return Buffer.from(entry.buffer, 'base64').toString('utf8');
      return '';
    })
    .map(stripAnsi)
    .filter(Boolean);
}

function collectFailedTests(suites = []) {
  const failures = [];

  function visitSuite(suite, parents = []) {
    const suitePath = [...parents, suite.title].filter(Boolean);

    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        const failedResults = (test.results ?? []).filter((result) => {
          return ['failed', 'timedOut', 'interrupted'].includes(result.status);
        });

        if (test.status !== 'unexpected' && failedResults.length === 0) continue;

        failures.push({
          title: [...suitePath, spec.title].filter(Boolean).join(' > '),
          file: spec.file,
          line: spec.line,
          projectName: test.projectName,
          failedResults,
        });
      }
    }

    for (const childSuite of suite.suites ?? []) {
      visitSuite(childSuite, suitePath);
    }
  }

  for (const suite of suites) {
    visitSuite(suite);
  }

  return failures;
}

function renderFailureLog(results) {
  const failures = collectFailedTests(results.suites);
  if (failures.length === 0) return null;

  const target = [process.env.E2E_OS, process.env.E2E_BROWSER_LABEL ?? process.env.E2E_BROWSER]
    .filter(Boolean)
    .join(' / ');
  const lines = [
    `# Failed Playwright Tests${target ? ` (${target})` : ''}`,
    '',
    `Generated from \`${resultPath}\`.`,
    '',
  ];

  for (const failure of failures) {
    lines.push(`## ${failure.title}`);
    lines.push('');
    lines.push(`- Project: \`${failure.projectName ?? 'unknown'}\``);
    lines.push(`- Location: \`${failure.file ?? 'unknown'}:${failure.line ?? '?'}\``);
    lines.push('');

    for (const [index, result] of failure.failedResults.entries()) {
      lines.push(`### Failed attempt ${index + 1}`);
      lines.push('');
      lines.push(`- Status: \`${result.status}\``);
      lines.push(`- Duration: \`${formatDuration(result.duration)}\``);

      const errors = result.errors?.length ? result.errors : result.error ? [result.error] : [];
      for (const error of errors) {
        const message = stripAnsi(error.stack || error.message || error.value || error);
        if (!message) continue;
        lines.push('');
        lines.push('```text');
        lines.push(message);
        lines.push('```');
      }

      const stdout = normalizeTextEntries(result.stdout);
      if (stdout.length > 0) {
        lines.push('');
        lines.push('Stdout:');
        lines.push('```text');
        lines.push(stdout.join('\n'));
        lines.push('```');
      }

      const stderr = normalizeTextEntries(result.stderr);
      if (stderr.length > 0) {
        lines.push('');
        lines.push('Stderr:');
        lines.push('```text');
        lines.push(stderr.join('\n'));
        lines.push('```');
      }

      const attachments = (result.attachments ?? []).filter((attachment) => attachment.path);
      if (attachments.length > 0) {
        lines.push('');
        lines.push('Attachments:');
        for (const attachment of attachments) {
          lines.push(`- ${attachment.name ?? 'attachment'}: \`${attachment.path}\``);
        }
      }

      lines.push('');
    }
  }

  return `${lines.join('\n')}\n`;
}

if (!resultPath || !outputPath || !fs.existsSync(resultPath)) {
  process.exit(0);
}

const results = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
const log = renderFailureLog(results);
if (log) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, log);
}
