import { createHash } from 'node:crypto'

export function sha256Hex(content: Buffer | string): string {
  return createHash('sha256').update(content).digest('hex')
}

export function etagFromSha256(sha256: string): string {
  return `"${sha256}"`
}
