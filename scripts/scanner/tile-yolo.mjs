#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDir, '..', '..')

const config = {
  dataset: envPath('RUBIKS_TILE_YOLO_DATASET', 'scanner/outputs/tile-yolo-roboflow-v2/data.yaml'),
  baseModel: process.env.RUBIKS_TILE_YOLO_BASE_MODEL ?? 'yolo11n.pt',
  project: envPath('RUBIKS_TILE_YOLO_PROJECT', 'scanner/runs'),
  runName: process.env.RUBIKS_TILE_YOLO_RUN_NAME ?? 'tile-detector-roboflow-v2',
  imageSize: process.env.RUBIKS_TILE_YOLO_IMAGE_SIZE ?? '640',
  epochs: process.env.RUBIKS_TILE_YOLO_EPOCHS ?? '100',
  patience: process.env.RUBIKS_TILE_YOLO_PATIENCE ?? '25',
  batch: process.env.RUBIKS_TILE_YOLO_BATCH ?? '8',
  workers: process.env.RUBIKS_TILE_YOLO_WORKERS ?? '2',
  device: process.env.RUBIKS_TILE_YOLO_DEVICE ?? '0',
  seed: process.env.RUBIKS_TILE_YOLO_SEED ?? '0',
  mosaic: process.env.RUBIKS_TILE_YOLO_MOSAIC ?? '0.2',
  mixup: process.env.RUBIKS_TILE_YOLO_MIXUP ?? '0',
  copyPaste: process.env.RUBIKS_TILE_YOLO_COPY_PASTE ?? '0',
  degrees: process.env.RUBIKS_TILE_YOLO_DEGREES ?? '10',
  translate: process.env.RUBIKS_TILE_YOLO_TRANSLATE ?? '0.08',
  scale: process.env.RUBIKS_TILE_YOLO_SCALE ?? '0.25',
  opset: process.env.RUBIKS_TILE_YOLO_ONNX_OPSET ?? '12',
  simplify: process.env.RUBIKS_TILE_YOLO_ONNX_SIMPLIFY ?? 'True',
  installedModel: envPath('RUBIKS_TILE_YOLO_INSTALLED_MODEL', 'scanner/models/tile-detector.onnx'),
}

config.runDir = join(config.project, config.runName)
config.bestPt = join(config.runDir, 'weights', 'best.pt')
config.bestOnnx = join(config.runDir, 'weights', 'best.onnx')

const command = process.argv[2]
const optionalCheck = process.argv.includes('--optional')

switch (command) {
  case 'check':
    runCheck()
    break
  case 'train':
    runTrain()
    break
  case 'export':
    runExport()
    break
  case 'install':
    runInstall()
    break
  default:
    printUsage()
    process.exit(command === undefined ? 0 : 1)
}

function envPath(name, fallback) {
  return normalizePath(process.env[name] ?? fallback)
}

function normalizePath(value) {
  return isAbsolute(value) ? value : join(repoRoot, value)
}

function rel(path) {
  return path.startsWith(`${repoRoot}/`) ? path.slice(repoRoot.length + 1) : path
}

function findYoloBinary() {
  if (process.env.RUBIKS_TILE_YOLO_BIN !== undefined) {
    return process.env.RUBIKS_TILE_YOLO_BIN
  }

  const venvYolo = join(repoRoot, '.venv', 'bin', 'yolo')
  return existsSync(venvYolo) ? venvYolo : 'yolo'
}

function yoloAvailable() {
  const result = spawnSync(findYoloBinary(), ['--help'], { cwd: repoRoot, stdio: 'ignore' })
  return !result.error && result.status === 0
}

function runCheck() {
  const checks = [
    requiredCheck('YOLO CLI', yoloAvailable(), rel(findYoloBinary())),
    requiredCheck('dataset data.yaml', existsSync(config.dataset), rel(config.dataset)),
    ...datasetDirectoryChecks(),
    informationalCheck('base model', baseModelStatus(), config.baseModel),
    informationalCheck('trained weights', existsSync(config.bestPt), rel(config.bestPt)),
    informationalCheck('exported ONNX', existsSync(config.bestOnnx), rel(config.bestOnnx)),
    informationalCheck('installed runtime ONNX', existsSync(config.installedModel), rel(config.installedModel)),
  ]

  for (const check of checks) {
    const status = check.ok ? 'ok' : check.required ? 'missing' : 'not found'
    console.log(`${status.padEnd(9)} ${check.name}${check.detail ? `: ${check.detail}` : ''}`)
  }

  const failed = checks.filter((check) => check.required && !check.ok)
  if (failed.length > 0) {
    console.error(`\nMissing ${failed.length} required training prerequisite(s).`)
    if (optionalCheck) {
      console.error('Continuing because --optional was provided.')
      return
    }
    process.exit(1)
  }
}

function datasetDirectoryChecks() {
  if (!existsSync(config.dataset)) {
    return []
  }

  const dataset = readDatasetYaml(config.dataset)
  const datasetRoot = normalizeDatasetRoot(dataset.path, dirname(config.dataset))
  const trainImages = normalizeDatasetChild(dataset.train ?? 'images/train', datasetRoot)
  const validationImages = normalizeDatasetChild(dataset.val ?? 'images/validation', datasetRoot)
  const trainLabels = imagePathToLabelPath(trainImages)
  const validationLabels = imagePathToLabelPath(validationImages)

  return [
    requiredCheck('train images', hasFiles(trainImages), rel(trainImages)),
    requiredCheck('validation images', hasFiles(validationImages), rel(validationImages)),
    requiredCheck('train labels', hasFiles(trainLabels), rel(trainLabels)),
    requiredCheck('validation labels', hasFiles(validationLabels), rel(validationLabels)),
  ]
}

function readDatasetYaml(path) {
  const data = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const match = line.match(/^([A-Za-z_]+):\s*(.+?)\s*$/)
    if (match !== null) {
      data[match[1]] = match[2].replace(/^['"]|['"]$/g, '')
    }
  }
  return data
}

function normalizeDatasetRoot(value, fallbackDir) {
  if (value === undefined) {
    return fallbackDir
  }
  return isAbsolute(value) ? value : join(repoRoot, value)
}

function normalizeDatasetChild(value, root) {
  return isAbsolute(value) ? value : join(root, value)
}

function imagePathToLabelPath(path) {
  return path.replace(/(^|\/)images(\/|$)/, '$1labels$2')
}

function hasFiles(path) {
  try {
    return readdirSync(path).some((entry) => !entry.startsWith('.'))
  } catch {
    return false
  }
}

function baseModelStatus() {
  if (existsSync(normalizePath(config.baseModel))) {
    return true
  }
  return /^yolo\d+[a-z]\.pt$/i.test(config.baseModel)
}

function requiredCheck(name, ok, detail) {
  return { name, ok, detail, required: true }
}

function informationalCheck(name, ok, detail) {
  return { name, ok, detail, required: false }
}

function runTrain() {
  assertTrainPrerequisites()
  runYolo([
    'detect',
    'train',
    `model=${config.baseModel}`,
    `data=${config.dataset}`,
    `imgsz=${config.imageSize}`,
    `epochs=${config.epochs}`,
    `patience=${config.patience}`,
    `batch=${config.batch}`,
    `workers=${config.workers}`,
    `device=${config.device}`,
    `project=${config.project}`,
    `name=${config.runName}`,
    'exist_ok=True',
    `seed=${config.seed}`,
    `mosaic=${config.mosaic}`,
    `mixup=${config.mixup}`,
    `copy_paste=${config.copyPaste}`,
    `degrees=${config.degrees}`,
    `translate=${config.translate}`,
    `scale=${config.scale}`,
  ])
}

function runExport() {
  assertYoloAvailable()
  assertFile(config.bestPt, 'trained YOLO weights')
  runYolo([
    'export',
    `model=${config.bestPt}`,
    'format=onnx',
    `imgsz=${config.imageSize}`,
    `opset=${config.opset}`,
    `simplify=${config.simplify}`,
  ])
}

function runInstall() {
  assertFile(config.bestOnnx, 'exported YOLO ONNX model')
  mkdirSync(dirname(config.installedModel), { recursive: true })
  copyFileSync(config.bestOnnx, config.installedModel)
  console.log(`installed ${rel(config.installedModel)}`)
}

function assertTrainPrerequisites() {
  assertYoloAvailable()
  assertFile(config.dataset, 'YOLO dataset data.yaml')
  const missingDirectories = datasetDirectoryChecks().filter((check) => !check.ok)
  if (missingDirectories.length > 0) {
    for (const check of missingDirectories) {
      console.error(`missing ${check.name}: ${check.detail}`)
    }
    throw new Error('YOLO dataset is incomplete')
  }
}

function assertYoloAvailable() {
  if (!yoloAvailable()) {
    throw new Error('Ultralytics YOLO CLI was not found. Install it with `.venv/bin/python -m pip install ultralytics` or set RUBIKS_TILE_YOLO_BIN.')
  }
}

function assertFile(path, description) {
  if (!existsSync(path)) {
    throw new Error(`Missing ${description}: ${rel(path)}`)
  }
}

function runYolo(args) {
  const yolo = findYoloBinary()
  console.log(`${rel(yolo)} ${args.join(' ')}`)
  const result = spawnSync(yolo, args, {
    cwd: repoRoot,
    env: { ...process.env, WANDB_DISABLED: process.env.WANDB_DISABLED ?? 'true' },
    stdio: 'inherit',
  })
  if (result.error) {
    throw result.error
  }
  process.exit(result.status ?? 1)
}

function printUsage() {
  console.log(`Usage: node scripts/scanner/tile-yolo.mjs <check|train|export|install> [--optional]

Environment overrides:
  RUBIKS_TILE_YOLO_DATASET        ${rel(config.dataset)}
  RUBIKS_TILE_YOLO_BASE_MODEL     ${config.baseModel}
  RUBIKS_TILE_YOLO_PROJECT        ${rel(config.project)}
  RUBIKS_TILE_YOLO_RUN_NAME       ${config.runName}
  RUBIKS_TILE_YOLO_INSTALLED_MODEL ${rel(config.installedModel)}
`)
}
