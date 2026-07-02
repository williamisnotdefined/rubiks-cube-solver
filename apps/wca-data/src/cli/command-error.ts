export class CommandError extends Error {
  readonly exitCode: number

  constructor(message: string, exitCode = 1) {
    super(message)
    this.name = 'CommandError'
    this.exitCode = exitCode
  }
}
