#!/usr/bin/env node

import http from 'node:http'
import https from 'node:https'

const [label, rawUrl, rawTimeoutMs] = process.argv.slice(2)

if (process.argv.includes('--help') || process.argv.includes('-h') || !label || !rawUrl) {
  printUsage()
  process.exit(label && rawUrl ? 0 : 1)
}

const timeoutMs = Number(rawTimeoutMs ?? 120_000)

try {
  await waitForUrl(rawUrl, timeoutMs, label)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
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

  throw new Error(`${label} did not become ready within ${timeoutMs}ms: ${url}`)
}

function requestOk(rawUrl) {
  return new Promise((resolveOk) => {
    const url = new URL(rawUrl)
    const client = url.protocol === 'https:' ? https : http
    const request = client.get(url, { timeout: 2000 }, (response) => {
      response.resume()
      resolveOk(response.statusCode !== undefined && response.statusCode >= 200 && response.statusCode < 300)
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

function printUsage() {
  console.log(`Usage: node scripts/runtime/wait-url.mjs <label> <url> [timeoutMs]

Waits until <url> returns a 2xx response.

Examples:
  node scripts/runtime/wait-url.mjs app http://127.0.0.1:8787/health 120000
`)
}
