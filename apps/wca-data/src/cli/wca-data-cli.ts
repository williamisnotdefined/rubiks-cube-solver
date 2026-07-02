import { CommandError } from './command-error.js'
import { runSyncOnceCommand, type SyncOnceCommandDeps } from './commands/sync-once.command.js'
import type { CliIo } from './io.js'

export type WcaDataCliDeps = {
  syncOnce?: SyncOnceCommandDeps
}

export async function runWcaDataCli(args: string[], io: CliIo, deps: WcaDataCliDeps = {}): Promise<number> {
  const [command, ...commandArgs] = args

  switch (command) {
    case 'sync-once':
      return runSyncOnceCommand(commandArgs, io, deps.syncOnce)
    case '--help':
    case '-h':
    case undefined:
      io.stdout(rootUsage())
      return 0
    default:
      throw new CommandError(`Unknown WCA Data command: ${command}`)
  }
}

export function rootUsage(): string {
  return `Usage: npm run <wca command> -- [options]

Commands:
  sync-once      Run one WCA import/build/publish cycle
`
}
