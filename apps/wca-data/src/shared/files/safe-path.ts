import { isAbsolute, relative, resolve } from 'node:path'
import { AppError } from '../errors/app-error.js'

export function safeJoin(root: string, relativePath: string): string {
  if (relativePath.includes('\0') || relativePath.includes('\\')) {
    throw new AppError('invalid_request', 'Invalid storage path', 400)
  }

  if (isAbsolute(relativePath)) {
    throw new AppError('invalid_request', 'Absolute storage paths are not allowed', 400)
  }

  if (relativePath.split('/').some((segment) => segment.length === 0 || segment === '.' || segment === '..')) {
    throw new AppError('invalid_request', 'Storage path contains an invalid segment', 400)
  }

  const resolvedRoot = resolve(root)
  const resolvedPath = resolve(resolvedRoot, relativePath)
  const relativeToRoot = relative(resolvedRoot, resolvedPath)

  if (relativeToRoot === '..' || relativeToRoot.startsWith('../') || isAbsolute(relativeToRoot)) {
    throw new AppError('invalid_request', 'Storage path escapes root', 400)
  }

  return resolvedPath
}
