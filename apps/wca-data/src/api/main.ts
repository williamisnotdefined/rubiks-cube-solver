import 'reflect-metadata'
import { loadEnv } from '../config/env.js'
import { createWcaDataApi } from './create-wca-data-api.js'

try {
  const env = loadEnv()
  const app = await createWcaDataApi({ env })

  await app.listen(env.WCA_DATA_PORT, env.WCA_DATA_HOST)
} catch (error) {
  console.error('Failed to start WCA Data API.', error)
  process.exitCode = 1
}
