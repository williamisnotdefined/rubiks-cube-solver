import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { YauzlZipReader } from '../yauzl-zip-reader.js'

let tempDir: string | undefined

afterEach(async () => {
  if (tempDir !== undefined) {
    await rm(tempDir, { force: true, recursive: true })
    tempDir = undefined
  }
})

describe('YauzlZipReader', () => {
  it('iterates real ZIP entries and opens file streams', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'wca-yauzl-'))
    const archivePath = join(tempDir, 'fixture.zip')
    await writeFile(archivePath, createStoredZip([
      { content: '', fileName: 'nested/' },
      { content: 'events', fileName: 'WCA_export_Events.tsv' },
      { content: 'readme', fileName: 'nested/README.md' },
    ]))

    const entries = []
    for await (const entry of new YauzlZipReader().entries(archivePath)) {
      entries.push({
        content: entry.isDirectory ? null : await streamToString(await entry.openReadStream()),
        fileName: entry.fileName,
        isDirectory: entry.isDirectory,
      })
    }

    expect(entries).toEqual([
      { content: null, fileName: 'nested/', isDirectory: true },
      { content: 'events', fileName: 'WCA_export_Events.tsv', isDirectory: false },
      { content: 'readme', fileName: 'nested/README.md', isDirectory: false },
    ])
  })

  it('rejects ZIP entries with invalid strict filenames', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'wca-yauzl-'))
    const archivePath = join(tempDir, 'unsafe.zip')
    await writeFile(archivePath, createStoredZip([{ content: 'bad', fileName: 'bad\\name.tsv' }]))

    await expect(readAllEntries(archivePath)).rejects.toThrow()
  })
})

async function readAllEntries(archivePath: string): Promise<string[]> {
  const fileNames: string[] = []

  for await (const entry of new YauzlZipReader().entries(archivePath)) {
    fileNames.push(entry.fileName)
  }

  return fileNames
}

async function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = []

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)))
  }

  return Buffer.concat(chunks).toString('utf8')
}

function createStoredZip(entries: Array<{ content: string; fileName: string }>): Buffer {
  const localParts: Buffer[] = []
  const centralParts: Buffer[] = []
  let offset = 0

  for (const entry of entries) {
    const fileName = Buffer.from(entry.fileName, 'utf8')
    const content = Buffer.from(entry.content, 'utf8')
    const crc = crc32(content)
    const localHeader = Buffer.alloc(30)
    localHeader.writeUInt32LE(0x04034b50, 0)
    localHeader.writeUInt16LE(20, 4)
    localHeader.writeUInt16LE(0, 6)
    localHeader.writeUInt16LE(0, 8)
    localHeader.writeUInt16LE(0, 10)
    localHeader.writeUInt16LE(0, 12)
    localHeader.writeUInt32LE(crc, 14)
    localHeader.writeUInt32LE(content.length, 18)
    localHeader.writeUInt32LE(content.length, 22)
    localHeader.writeUInt16LE(fileName.length, 26)
    localHeader.writeUInt16LE(0, 28)
    localParts.push(localHeader, fileName, content)

    const centralHeader = Buffer.alloc(46)
    centralHeader.writeUInt32LE(0x02014b50, 0)
    centralHeader.writeUInt16LE(20, 4)
    centralHeader.writeUInt16LE(20, 6)
    centralHeader.writeUInt16LE(0, 8)
    centralHeader.writeUInt16LE(0, 10)
    centralHeader.writeUInt16LE(0, 12)
    centralHeader.writeUInt16LE(0, 14)
    centralHeader.writeUInt32LE(crc, 16)
    centralHeader.writeUInt32LE(content.length, 20)
    centralHeader.writeUInt32LE(content.length, 24)
    centralHeader.writeUInt16LE(fileName.length, 28)
    centralHeader.writeUInt16LE(0, 30)
    centralHeader.writeUInt16LE(0, 32)
    centralHeader.writeUInt16LE(0, 34)
    centralHeader.writeUInt16LE(0, 36)
    centralHeader.writeUInt32LE(entry.fileName.endsWith('/') ? 0x10 : 0, 38)
    centralHeader.writeUInt32LE(offset, 42)
    centralParts.push(centralHeader, fileName)

    offset += localHeader.length + fileName.length + content.length
  }

  const centralDirectory = Buffer.concat(centralParts)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(0, 4)
  end.writeUInt16LE(0, 6)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(centralDirectory.length, 12)
  end.writeUInt32LE(offset, 16)
  end.writeUInt16LE(0, 20)

  return Buffer.concat([...localParts, centralDirectory, end])
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff

  for (const byte of buffer) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff]
  }

  return (crc ^ 0xffffffff) >>> 0
}

const crcTable = Array.from({ length: 256 }, (_value, index) => {
  let crc = index

  for (let bit = 0; bit < 8; bit += 1) {
    crc = (crc & 1) === 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1
  }

  return crc >>> 0
})
