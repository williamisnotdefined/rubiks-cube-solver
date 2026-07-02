export type CliIo = {
  stderr: (message: string) => void
  stdout: (message: string) => void
}

export const processCliIo: CliIo = {
  stderr: (message) => console.error(message),
  stdout: (message) => console.log(message),
}
