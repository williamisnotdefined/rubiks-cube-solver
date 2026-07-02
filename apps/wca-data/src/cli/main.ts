import { CommandError } from './command-error.js'
import { processCliIo } from './io.js'
import { runWcaDataCli } from './wca-data-cli.js'

try {
  process.exitCode = await runWcaDataCli(process.argv.slice(2), processCliIo)
} catch (error) {
  if (error instanceof CommandError) {
    processCliIo.stderr(error.message)
    process.exitCode = error.exitCode
  } else {
    processCliIo.stderr(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
