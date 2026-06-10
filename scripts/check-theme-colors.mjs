#!/usr/bin/env node

import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const rootDir = path.resolve(import.meta.dirname, '..')
const themeCssPath = 'web/src/index.css'
const arbitraryHexPattern = new RegExp(`(-${'\\['}#|${'\\['}#)`)
const rawHexPattern = /#[0-9a-fA-F]{3,8}\b/

const checkedPathPrefixes = [
  'web/index.html',
  'web/src/',
  'ai/',
  '.cursor/rules/',
  '.opencode/skills/',
  '.github/instructions/',
]

const appPathPrefixes = ['web/index.html', 'web/src/']
const docPathPrefixes = ['ai/', '.cursor/rules/', '.opencode/skills/', '.github/instructions/']

const { stdout } = await execFileAsync('git', ['ls-files'], { cwd: rootDir })
const files = stdout
  .split('\n')
  .filter(Boolean)
  .filter((filePath) => checkedPathPrefixes.some((prefix) => filePath === prefix || filePath.startsWith(prefix)))

const failures = []

for (const filePath of files) {
  let content

  try {
    content = await readFile(path.join(rootDir, filePath), 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT') {
      continue
    }

    throw error
  }

  const appFile = appPathPrefixes.some((prefix) => filePath === prefix || filePath.startsWith(prefix))
  const docFile = docPathPrefixes.some((prefix) => filePath.startsWith(prefix))

  if (appFile && filePath !== themeCssPath) {
    collectMatches(filePath, content, rawHexPattern, 'raw hex color outside web/src/index.css')
  }

  if (appFile || docFile) {
    collectMatches(filePath, content, arbitraryHexPattern, 'hardcoded arbitrary hex color marker')
  }
}

if (failures.length > 0) {
  console.error('Theme color check failed. Use semantic theme tokens or CSS variables instead.')
  console.error(`Raw hex colors belong only in ${themeCssPath}.`)
  console.error('')
  for (const failure of failures) {
    console.error(`${failure.filePath}:${failure.line}:${failure.column} ${failure.reason}`)
    console.error(`  ${failure.text}`)
  }
  process.exit(1)
}

console.log(`Theme color check passed: ${files.length} files checked.`)

function collectMatches(filePath, content, pattern, reason) {
  const lines = content.split('\n')

  for (const [index, line] of lines.entries()) {
    pattern.lastIndex = 0
    const match = pattern.exec(line)

    if (match === null) {
      continue
    }

    failures.push({
      column: match.index + 1,
      filePath,
      line: index + 1,
      reason,
      text: line.trim(),
    })
  }
}
