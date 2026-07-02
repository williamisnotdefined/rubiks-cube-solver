import { loadEnv, requireDatabaseEnv } from '../config/env.js'
import type { WcaDataWorker } from './sync-worker.js'
import { startWcaDataWorkerRuntime } from './worker-runtime.js'

const env = requireDatabaseEnv(loadEnv())
let worker: WcaDataWorker | undefined
let stopping = false

try {
  worker = await startWcaDataWorkerRuntime({ env })
} catch (error) {
  console.error('Failed to start WCA Data worker.', error)
  process.exitCode = 1
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void stopWorker(signal)
  })
}

async function stopWorker(signal: NodeJS.Signals): Promise<void> {
  if (stopping) {
    return
  }

  stopping = true
  console.info(`Stopping WCA Data worker after ${signal}.`)

  await worker?.stop()
  process.exit(0)
}
