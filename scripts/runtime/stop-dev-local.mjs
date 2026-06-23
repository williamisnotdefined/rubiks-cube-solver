#!/usr/bin/env node

import { existsSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDir, '..', '..')
const runtimeDir = join(repoRoot, 'logs', 'dev-local')
const serviceNames = ['web', 'api', 'vision']

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Usage: npm run dev:local:stop')
  process.exit(0)
}

for (const name of serviceNames) {
  stopService(name)
}

function stopService(name) {
  const pidPath = join(runtimeDir, `${name}.pid`)
  const pid = readPid(pidPath)
  if (pid === undefined) {
    console.log(`stopped   ${name}: no pid file`)
    return
  }

  if (!isRunning(pid)) {
    rmSync(pidPath, { force: true })
    console.log(`stopped   ${name}: stale pid ${pid}`)
    return
  }

  try {
    process.kill(-pid, 'SIGTERM')
  } catch {
    process.kill(pid, 'SIGTERM')
  }
  rmSync(pidPath, { force: true })
  console.log(`stopped   ${name}: pid ${pid}`)
}

function readPid(path) {
  if (!existsSync(path)) {
    return undefined
  }
  const value = Number(readFileSync(path, 'utf8').trim())
  return Number.isInteger(value) ? value : undefined
}

function isRunning(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}
