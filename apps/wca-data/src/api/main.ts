import { loadEnv } from '../config/env.js'
import { createWcaDataApi } from './create-wca-data-api.js'

const env = loadEnv()
const app = await createWcaDataApi({ env })

try {
  await app.listen({ host: env.WCA_DATA_HOST, port: env.WCA_DATA_PORT })
} catch (error) {
  app.log.error({ error }, 'Failed to start WCA Data API')
  process.exitCode = 1
}
