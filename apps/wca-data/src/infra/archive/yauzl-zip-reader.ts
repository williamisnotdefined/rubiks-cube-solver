import { openPromise } from 'yauzl'
import type { ZipEntry, ZipReader } from './zip-reader.js'

export class YauzlZipReader implements ZipReader {
  async *entries(archivePath: string): AsyncIterable<ZipEntry> {
    const zipFile = await openPromise(archivePath, {
      lazyEntries: false,
      strictFileNames: true,
      validateEntrySizes: true,
    })

    try {
      for await (const entry of zipFile.eachEntry()) {
        yield {
          fileName: entry.fileName,
          isDirectory: entry.fileName.endsWith('/'),
          openReadStream: () => zipFile.openReadStreamPromise(entry),
        }
      }
    } finally {
      zipFile.close()
    }
  }
}
