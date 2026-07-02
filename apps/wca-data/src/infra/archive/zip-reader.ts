import type { Readable } from 'node:stream'

export type ZipEntry = {
  fileName: string
  isDirectory: boolean
  openReadStream: () => Promise<Readable>
}

export type ZipReader = {
  entries: (archivePath: string) => AsyncIterable<ZipEntry>
}
