#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDir, '..', '..')
const runtimeDir = join(repoRoot, 'logs', 'zero-install')
const services = [
  ['web', 'http://127.0.0.1:5173'],
  ['api', 'http://127.0.0.1:8788/health'],
  ['vision', 'http://127.0.0.1:8791/health'],
]

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Usage: npm run zero:status')
  process.exit(0)
}

for (const [name, url] of services) {
  const pid = readPid(join(runtimeDir, `${name}.pid`))
  const status = pid !== undefined && isRunning(pid) ? `running pid ${pid}` : 'stopped'
  console.log(`${name.padEnd(7)} ${status.padEnd(18)} ${url} ${relativeLog(name)}`)
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

function relativeLog(name) {
  const logPath = join(runtimeDir, `${name}.log`)
  return logPath.startsWith(`${repoRoot}/`) ? logPath.slice(repoRoot.length + 1) : logPath
}
