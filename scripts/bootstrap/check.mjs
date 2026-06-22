#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDir, '..', '..')

const steps = [
  ['AI routes', 'npm', ['run', 'ai:check']],
  ['Rust format', 'cargo', ['fmt', '--check']],
  ['Cube engine tests', 'cargo', ['test', '-p', 'cube-engine']],
  ['API tests', 'npm', ['run', 'api:test']],
  ['Scanner runtime tests', 'npm', ['run', 'vision:test']],
  ['Scanner training tests', 'npm', ['run', 'scanner:training:test']],
  ['Web build', 'npm', ['run', 'build']],
  ['Web lint', 'npm', ['run', 'lint', '-w', '@rubiks-cube-solver/web']],
  ['YOLO local artifact check', 'npm', ['run', 'scan:tile-yolo-check', '--', '--optional']],
]

for (const [label, command, args] of steps) {
  console.log(`\n==> ${label}`)
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env,
  })

  if (result.error !== undefined) {
    console.error(result.error.message)
    process.exit(1)
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

console.log('\nBootstrap check passed.')
