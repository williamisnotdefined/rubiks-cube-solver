#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDir, '..', '..')
const venvPython = join(repoRoot, '.venv', 'bin', 'python')
const datasetYaml = join(repoRoot, 'scanner', 'outputs', 'tile-yolo-roboflow-v2', 'data.yaml')
const scannerModel = join(repoRoot, 'scanner', 'models', 'tile-detector.onnx')
const pruningTableDir = join(repoRoot, 'crates', 'cube-engine', 'pruning-tables')
const requiredPruningTables = [
  'phase1-corner-edge-orientation.rpt',
  'phase1-corner-orientation-ud-slice.rpt',
  'phase1-edge-orientation-ud-slice.rpt',
  'phase2-corner-permutation-slice-edge-permutation.rpt',
  'phase2-ud-edge-permutation-slice-edge-permutation.rpt',
]

try {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    printUsage()
    process.exit(0)
  }

  runZeroPrepare(options)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}

function runZeroPrepare(options) {
  console.log('Preparing Rubik\'s Cube Solver local runtime...')

  const python = findPython()
  checkCommand('npm', ['--version'], 'npm')
  checkCommand('cargo', ['--version'], 'Rust cargo')
  if (!options.skipLfs) {
    checkCommand('git', ['lfs', 'version'], 'Git LFS')
  }
  checkDiskSpace()

  if (!options.skipLfs) {
    run('git', ['lfs', 'pull'])
  }

  if (!options.skipNode) {
    run('npm', ['ci'])
  }

  if (!options.skipPython) {
    if (!existsSync(venvPython)) {
      run(python.command, ['-m', 'venv', '.venv'])
    } else {
      console.log('ok        Python virtualenv: .venv')
    }
    run(venvPython, ['-m', 'pip', 'install', '--upgrade', 'pip'])
    run(venvPython, [
      '-m',
      'pip',
      'install',
      '-r',
      'scanner/runtime/requirements.txt',
      '-r',
      'scanner/requirements-test.txt',
    ])
  }

  if (options.force || !existsSync(datasetYaml)) {
    run('npm', ['run', 'scan:tile-yolo-roboflow-dataset'])
  } else {
    console.log('ok        YOLO dataset: scanner/outputs/tile-yolo-roboflow-v2/data.yaml')
  }

  if (!options.skipPruning) {
    if (options.force || !pruningTablesReady()) {
      run('cargo', [
        'run',
        '--release',
        '--quiet',
        '-p',
        'cube-engine',
        '--bin',
        'generate_pruning_tables',
        '--',
        '--output',
        'crates/cube-engine/pruning-tables',
        '--phase1-max-depth',
        '8',
        '--phase2-max-depth',
        '10',
      ])
    } else {
      console.log('ok        Generated pruning tables: crates/cube-engine/pruning-tables')
    }
  }

  if (options.trainScanner && !options.skipScannerTraining) {
    run('npm', ['run', 'scan:tile-yolo-install-deps', '--', '--torch', options.torch])
    const yoloEnv = {
      RUBIKS_TILE_YOLO_DEVICE: yoloDevice(options.device),
      ...(options.epochs ? { RUBIKS_TILE_YOLO_EPOCHS: options.epochs } : {}),
      ...(options.batch ? { RUBIKS_TILE_YOLO_BATCH: options.batch } : {}),
    }
    run('npm', ['run', 'scan:tile-yolo-train'], { env: yoloEnv })
    run('npm', ['run', 'scan:tile-yolo-export'], { env: yoloEnv })
    run('npm', ['run', 'scan:tile-yolo-install'], { env: yoloEnv })
  }

  run('npm', ['run', 'scan:tile-yolo-check', '--', '--optional'])

  if (!existsSync(scannerModel)) {
    console.warn('warning   Scanner ONNX model not found: scanner/models/tile-detector.onnx')
    console.warn('          Run npm run zero:prepare -- --train-scanner when you want to build it locally.')
  }

  console.log('\nZero prepare completed. Start services with npm run zero:start.')
}

function parseArgs(args) {
  const options = {
    batch: undefined,
    device: 'cpu',
    epochs: undefined,
    force: false,
    help: false,
    skipLfs: false,
    skipNode: false,
    skipPruning: false,
    skipPython: false,
    skipScannerTraining: false,
    torch: 'cpu',
    trainScanner: false,
  }

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
      case '--skip-lfs':
        options.skipLfs = true
        break
      case '--skip-node':
        options.skipNode = true
        break
      case '--skip-python':
        options.skipPython = true
        break
      case '--skip-pruning':
        options.skipPruning = true
        break
      case '--train-scanner':
        options.trainScanner = true
        break
      case '--skip-scanner-training':
        options.skipScannerTraining = true
        break
      case '--device':
        options.device = requiredValue('--device', value())
        break
      case '--epochs':
        options.epochs = requiredValue('--epochs', value())
        break
      case '--batch':
        options.batch = requiredValue('--batch', value())
        break
      case '--torch':
        options.torch = requiredValue('--torch', value())
        break
      default:
        throw new Error(`Unknown option: ${arg}`)
    }
  }

  if (!['cpu', 'cuda'].includes(options.device)) {
    throw new Error('--device must be cpu or cuda')
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

function findPython() {
  for (const command of ['python3.14', 'python3', 'python']) {
    const result = spawnSync(command, ['--version'], { encoding: 'utf8' })
    if (result.error || result.status !== 0) {
      continue
    }
    const version = `${result.stdout}${result.stderr}`.match(/Python\s+(\d+)\.(\d+)/)
    if (version === null) {
      continue
    }
    const major = Number(version[1])
    const minor = Number(version[2])
    if (major > 3 || (major === 3 && minor >= 14)) {
      console.log(`ok        Python: ${command} ${major}.${minor}`)
      return { command, major, minor }
    }
  }

  throw new Error('Python 3.14+ was not found. Install Python 3.14 or set up .venv manually.')
}

function checkCommand(command, args, label) {
  const result = spawnSync(command, args, { cwd: repoRoot, encoding: 'utf8' })
  if (result.error || result.status !== 0) {
    throw new Error(`${label} is required for zero prepare.`)
  }
  const output = `${result.stdout}${result.stderr}`.trim().split('\n')[0]
  console.log(`ok        ${label}${output ? `: ${output}` : ''}`)
}

function checkDiskSpace() {
  const result = spawnSync('df', ['-Pk', repoRoot], { encoding: 'utf8' })
  if (result.error || result.status !== 0) {
    console.warn('warning   Could not check free disk space.')
    return
  }

  const [, dataLine] = result.stdout.trim().split('\n')
  const columns = dataLine?.trim().split(/\s+/) ?? []
  const availableKb = Number(columns[3])
  if (Number.isFinite(availableKb)) {
    const availableGb = availableKb / 1024 / 1024
    if (availableGb < 5) {
      console.warn(`warning   Low disk space: ${availableGb.toFixed(1)} GiB available.`)
    } else {
      console.log(`ok        Disk space: ${availableGb.toFixed(1)} GiB available`)
    }
  }
}

function pruningTablesReady() {
  return requiredPruningTables.every((file) => existsSync(join(pruningTableDir, file)))
}

function yoloDevice(device) {
  return device === 'cuda' ? '0' : 'cpu'
}

function run(command, args, options = {}) {
  console.log(`\n> ${[command, ...args].join(' ')}`)
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    env: { ...process.env, ...options.env },
    stdio: 'inherit',
  })
  if (result.error) {
    throw result.error
  }
  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status ?? 1}`)
  }
}

function printUsage() {
  console.log(`Usage: npm run zero:prepare -- [options]

Prepares local development/runtime artifacts without running the heavy validation gate.

Options:
  --force                    Regenerate local artifacts even when present
  --skip-lfs                 Skip git lfs pull
  --skip-node                Skip npm ci
  --skip-python              Skip .venv and scanner runtime dependency install
  --skip-pruning             Skip native pruning table generation
  --train-scanner            Train, export, and install scanner YOLO ONNX model
  --skip-scanner-training    Keep scanner training disabled even when scripted externally
  --device cpu|cuda          YOLO training device, default cpu
  --epochs N                 Override RUBIKS_TILE_YOLO_EPOCHS during training
  --batch N                  Override RUBIKS_TILE_YOLO_BATCH during training
  --torch cpu|cu128|skip     Torch flavor for YOLO deps, default cpu
  --help                     Show this help
`)
}
