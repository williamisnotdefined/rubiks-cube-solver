#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDir, '..', '..')
const venvPython = join(repoRoot, '.venv', 'bin', 'python')
const python = process.env.RUBIKS_PYTHON ?? (existsSync(venvPython) ? venvPython : 'python')

try {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    printUsage()
    process.exit(0)
  }

  installYoloDeps(options)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}

function installYoloDeps(options) {
  checkPython()

  if (options.torch === 'skip') {
    console.log('skipping Torch install because --torch skip was provided')
  } else {
    const currentTorch = currentTorchCuda()
    if (options.torch === 'cpu' && currentTorch !== undefined && currentTorch !== 'cpu' && !options.force) {
      console.log(`keeping existing CUDA Torch (${currentTorch}); pass --force to replace it with CPU Torch`)
    } else {
      installTorch(options.torch)
    }
  }

  run(python, [
    '-m',
    'pip',
    'install',
    '-r',
    'scanner/training/requirements.txt',
    'ultralytics',
    'onnx',
    'onnxslim',
  ])
}

function parseArgs(args) {
  const options = { force: false, help: false, torch: 'cpu' }
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    const [flag, inlineValue] = arg.split('=', 2)
    const value = () => inlineValue ?? args[++index]

    switch (flag) {
      case '--help':
      case '-h':
        options.help = true
        break
      case '--force':
        options.force = true
        break
      case '--torch':
        options.torch = requiredValue('--torch', value())
        break
      default:
        throw new Error(`Unknown option: ${arg}`)
    }
  }

  if (!['cpu', 'cu128', 'skip'].includes(options.torch)) {
    throw new Error('--torch must be cpu, cu128, or skip')
  }

  return options
}

function requiredValue(flag, value) {
  if (value === undefined || value.startsWith('--')) {
    throw new Error(`${flag} requires a value`)
  }
  return value
}

function checkPython() {
  const result = spawnSync(python, ['--version'], { encoding: 'utf8' })
  if (result.error || result.status !== 0) {
    throw new Error(`Python was not found: ${python}`)
  }
  const output = `${result.stdout}${result.stderr}`.trim()
  console.log(`using ${python}: ${output}`)
}

function currentTorchCuda() {
  const result = spawnSync(
    python,
    ['-c', 'import torch; print(torch.version.cuda or "cpu")'],
    { cwd: repoRoot, encoding: 'utf8' },
  )
  if (result.error || result.status !== 0) {
    return undefined
  }
  return result.stdout.trim() || 'cpu'
}

function installTorch(torchFlavor) {
  const indexUrl = torchFlavor === 'cpu'
    ? 'https://download.pytorch.org/whl/cpu'
    : `https://download.pytorch.org/whl/${torchFlavor}`
  run(python, ['-m', 'pip', 'install', '--index-url', indexUrl, 'torch', 'torchvision'])
}

function run(command, args) {
  console.log(`\n> ${[command, ...args].join(' ')}`)
  const result = spawnSync(command, args, { cwd: repoRoot, env: process.env, stdio: 'inherit' })
  if (result.error) {
    throw result.error
  }
  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status ?? 1}`)
  }
}

function printUsage() {
  console.log(`Usage: npm run scan:tile-yolo-install-deps -- [options]

Options:
  --torch cpu|cu128|skip   Torch wheel flavor, default cpu
  --force                  Allow replacing an existing CUDA Torch install with CPU Torch
  --help                   Show this help
`)
}
