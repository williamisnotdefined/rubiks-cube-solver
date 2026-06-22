#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs'
import http from 'node:http'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDir, '..', '..')
const runtimeDir = join(repoRoot, 'logs', 'zero-install')
const venvPython = join(repoRoot, '.venv', 'bin', 'python')
const scannerModel = join(repoRoot, 'scanner', 'models', 'tile-detector.onnx')
const pruningTableDir = join(repoRoot, 'crates', 'cube-engine', 'pruning-tables')
const requiredPruningTables = [
  'phase1-corner-edge-orientation.rpt',
  'phase1-corner-orientation-ud-slice.rpt',
  'phase1-edge-orientation-ud-slice.rpt',
  'phase2-corner-permutation-slice-edge-permutation.rpt',
  'phase2-ud-edge-permutation-slice-edge-permutation.rpt',
]

const args = new Set(process.argv.slice(2))
if (args.has('--help') || args.has('-h')) {
  printUsage()
  process.exit(0)
}

const waitForServices = !args.has('--no-wait')

try {
  await main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}

async function main() {
  ensureRuntimeReady()
  mkdirSync(runtimeDir, { recursive: true })

  const services = [
    {
      name: 'vision',
      command: venvPython,
      args: ['-m', 'uvicorn', 'scanner.runtime.app:app', '--host', '127.0.0.1', '--port', '8791'],
      env: {
        RUBIKS_VISION_TILE_DETECTOR_MODEL: 'scanner/models/tile-detector.onnx',
        RUBIKS_VISION_TILE_DETECTOR_INPUT_SIZE: '640',
        RUBIKS_VISION_TILE_DETECTOR_CONFIDENCE: '0.5',
      },
      healthUrl: 'http://127.0.0.1:8791/health',
      waitMs: 45_000,
    },
    {
      name: 'api',
      command: 'cargo',
      args: ['run', '-p', 'rubiks-cube-solver-api'],
      env: {
        RUBIKS_API_ADDR: '127.0.0.1:8788',
        RUBIKS_VISION_URL: 'http://127.0.0.1:8791',
      },
      healthUrl: 'http://127.0.0.1:8788/health',
      waitMs: 120_000,
    },
    {
      name: 'web',
      command: 'npm',
      args: ['run', 'dev', '-w', '@rubiks-cube-solver/web', '--', '--host', '127.0.0.1', '--port', '5173'],
      env: {
        VITE_RUBIKS_API_URL: 'http://127.0.0.1:8788',
      },
      healthUrl: 'http://127.0.0.1:5173/',
      waitMs: 60_000,
    },
  ]

  for (const service of services) {
    startService(service)
  }

  if (waitForServices) {
    for (const service of services) {
      await waitForUrl(service.healthUrl, service.waitMs, service.name)
    }
  }

  console.log('\nZero runtime is ready:')
  console.log('  Web:    http://127.0.0.1:5173')
  console.log('  API:    http://127.0.0.1:8788/health')
  console.log('  Vision: http://127.0.0.1:8791/health')
  console.log('  Logs:   logs/zero-install')
}

function ensureRuntimeReady() {
  if (!existsSync(venvPython)) {
    throw new Error('Missing .venv/bin/python. Run npm run zero:prepare first.')
  }
  if (!requiredPruningTables.every((file) => existsSync(join(pruningTableDir, file)))) {
    throw new Error('Missing generated pruning tables. Run npm run zero:prepare first.')
  }
  if (!existsSync(scannerModel)) {
    console.warn('warning   scanner/models/tile-detector.onnx is missing; scanner health will report the detector unavailable.')
  }
}

function startService(service) {
  const pidPath = servicePidPath(service.name)
  const existingPid = readPid(pidPath)
  if (existingPid !== undefined && isRunning(existingPid)) {
    console.log(`ok        ${service.name} already running with pid ${existingPid}`)
    return
  }

  const logPath = join(runtimeDir, `${service.name}.log`)
  const fd = openSync(logPath, 'a')
  writeFileSync(fd, `\n[${new Date().toISOString()}] starting ${service.name}: ${service.command} ${service.args.join(' ')}\n`)
  const child = spawn(service.command, service.args, {
    cwd: repoRoot,
    detached: true,
    env: { ...process.env, ...service.env },
    stdio: ['ignore', fd, fd],
  })
  child.unref()
  closeSync(fd)
  writeFileSync(pidPath, `${child.pid}\n`)
  console.log(`started   ${service.name} pid ${child.pid} -> ${relativePath(logPath)}`)
}

async function waitForUrl(url, timeoutMs, label) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    if (await requestOk(url)) {
      console.log(`ready     ${label}: ${url}`)
      return
    }
    await delay(1000)
  }

  throw new Error(`${label} did not become ready within ${timeoutMs}ms. Check logs/zero-install/${label}.log.`)
}

function requestOk(url) {
  return new Promise((resolveOk) => {
    const request = http.get(url, { timeout: 2000 }, (response) => {
      response.resume()
      resolveOk(response.statusCode !== undefined && response.statusCode >= 200 && response.statusCode < 500)
    })
    request.on('timeout', () => {
      request.destroy()
      resolveOk(false)
    })
    request.on('error', () => resolveOk(false))
  })
}

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms))
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

function servicePidPath(name) {
  return join(runtimeDir, `${name}.pid`)
}

function relativePath(path) {
  return path.startsWith(`${repoRoot}/`) ? path.slice(repoRoot.length + 1) : path
}

function printUsage() {
  console.log(`Usage: npm run zero:start -- [options]

Starts the local prepared runtime on non-production ports:
  web    http://127.0.0.1:5173
  api    http://127.0.0.1:8788
  vision http://127.0.0.1:8791

Options:
  --no-wait   Start processes and skip health waiting
  --help      Show this help
`)
}
