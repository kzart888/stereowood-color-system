#!/usr/bin/env node

/**
 * One-command full gate:
 * docs contract + encoding + phase0 + core A checks + docker smoke.
 */

const { spawnSync } = require('child_process');

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const skipDocker = String(process.env.GATE_FULL_SKIP_DOCKER || 'false').toLowerCase() === 'true';

const steps = [
  { name: 'docs contract', type: 'node', cmd: 'node', args: ['scripts/docs-contract-check.js'] },
  { name: 'encoding audit', type: 'npm', cmd: npmCmd, args: ['run', 'audit:encoding'] },
  { name: 'phase0 smoke', type: 'npm', cmd: npmCmd, args: ['run', 'smoke:phase0'] },
  { name: 'phaseA a1 verify', type: 'npm', cmd: npmCmd, args: ['run', 'phaseA:a1:verify'] },
  { name: 'phaseA a3 verify', type: 'npm', cmd: npmCmd, args: ['run', 'phaseA:a3:verify'] },
  { name: 'phaseA a4 verify', type: 'npm', cmd: npmCmd, args: ['run', 'phaseA:a4:verify'] },
  { name: 'phaseA a5 verify', type: 'npm', cmd: npmCmd, args: ['run', 'phaseA:a5:verify'] },
  { name: 'phaseA a7 verify', type: 'npm', cmd: npmCmd, args: ['run', 'phaseA:a7:verify'] },
];

if (!skipDocker) {
  steps.push({ name: 'docker smoke', type: 'node', cmd: 'node', args: ['scripts/docker-smoke.js'] });
}

function runStep(step) {
  process.stdout.write(`\n[GATE] ${step.name}\n`);
  const isWindowsNpm = process.platform === 'win32' && step.type === 'npm';
  const command = isWindowsNpm ? (process.env.ComSpec || 'cmd.exe') : step.cmd;
  const args = isWindowsNpm
    ? ['/d', '/s', '/c', [step.cmd, ...step.args].join(' ')]
    : step.args;

  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: process.env,
  });
  if (result.error) {
    throw new Error(`Step failed: ${step.name} (${result.error.message})`);
  }
  if (result.status !== 0) {
    throw new Error(`Step failed: ${step.name} (exit ${result.status})`);
  }
}

function main() {
  try {
    steps.forEach(runStep);
    process.stdout.write('\nGATE_FULL=PASS\n');
  } catch (error) {
    process.stderr.write(`\nGATE_FULL=FAIL\n${error.message}\n`);
    process.exitCode = 1;
  }
}

main();
