import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const sourceBase = 'https://jperm.net'

const sets = [
  {
    exportName: 'threeByThreeOllCases',
    imageBase: 'oll',
    imageDir: '3x3/oll',
    puzzleId: '3x3',
    routeSlug: 'oll',
    sourceLabel: 'JPerm OLL',
    sourcePath: '/algs/oll',
    title: '3x3 OLL',
    tsPath: '3x3/oll.ts',
  },
  {
    exportName: 'threeByThreePllCases',
    imageBase: 'pll',
    imageDir: '3x3/pll',
    puzzleId: '3x3',
    routeSlug: 'pll',
    sourceLabel: 'JPerm PLL',
    sourcePath: '/algs/pll',
    title: '3x3 PLL',
    tsPath: '3x3/pll.ts',
  },
  {
    exportName: 'threeByThreeTwoLookOllCases',
    imageBase: '2look-oll',
    imageDir: '3x3/2look-oll',
    puzzleId: '3x3',
    routeSlug: '2look-oll',
    sourceLabel: 'JPerm Beginner OLL',
    sourcePath: '/algs/2look/oll',
    title: '3x3 2-Look OLL',
    tsPath: '3x3/twoLookOll.ts',
  },
  {
    exportName: 'threeByThreeTwoLookPllCases',
    imageBase: '2look-pll',
    imageDir: '3x3/2look-pll',
    puzzleId: '3x3',
    routeSlug: '2look-pll',
    sourceLabel: 'JPerm Beginner PLL',
    sourcePath: '/algs/2look/pll',
    title: '3x3 2-Look PLL',
    tsPath: '3x3/twoLookPll.ts',
  },
  {
    exportName: 'threeByThreeCollCases',
    imageBase: 'coll',
    imageDir: '3x3/coll',
    puzzleId: '3x3',
    routeSlug: 'coll',
    sourceLabel: 'JPerm COLL',
    sourcePath: '/algs/coll',
    title: '3x3 COLL',
    tsPath: '3x3/coll.ts',
  },
  {
    exportName: 'threeByThreeWinterVariationCases',
    imageBase: 'winter-variation',
    imageDir: '3x3/winter-variation',
    puzzleId: '3x3',
    routeSlug: 'winter-variation',
    sourceLabel: 'JPerm Winter Variation',
    sourcePath: '/algs/wv',
    title: '3x3 Winter Variation',
    tsPath: '3x3/winterVariation.ts',
  },
  {
    exportName: 'threeByThreeOhOllCases',
    imageBase: 'oh-oll',
    imageDir: '3x3/oh-oll',
    puzzleId: '3x3',
    routeSlug: 'oh-oll',
    sourceLabel: 'JPerm OH OLL',
    sourcePath: '/algs/oh/oll',
    title: '3x3 OH OLL',
    tsPath: '3x3/ohOll.ts',
  },
  {
    exportName: 'threeByThreeOhPllCases',
    imageBase: 'oh-pll',
    imageDir: '3x3/oh-pll',
    puzzleId: '3x3',
    routeSlug: 'oh-pll',
    sourceLabel: 'JPerm OH PLL',
    sourcePath: '/algs/oh/pll',
    title: '3x3 OH PLL',
    tsPath: '3x3/ohPll.ts',
  },
  {
    exportName: 'twoByTwoOllCases',
    imageBase: '2x2-oll',
    imageDir: '2x2/oll',
    puzzleId: '2x2',
    routeSlug: 'oll',
    sourceLabel: 'JPerm 2x2 OLL',
    sourcePath: '/algs/2x2/oll',
    title: '2x2 OLL',
    tsPath: '2x2/oll.ts',
  },
  {
    exportName: 'twoByTwoPblCases',
    imageBase: '2x2-pbl',
    imageDir: '2x2/pbl',
    puzzleId: '2x2',
    routeSlug: 'pbl',
    sourceLabel: 'JPerm 2x2 PBL',
    sourcePath: '/algs/2x2/pbl',
    title: '2x2 PBL',
    tsPath: '2x2/pbl.ts',
  },
  {
    exportName: 'twoByTwoCllCases',
    imageBase: '2x2-cll',
    imageDir: '2x2/cll',
    puzzleId: '2x2',
    routeSlug: 'cll',
    sourceLabel: 'JPerm 2x2 CLL',
    sourcePath: '/algs/2x2/cll',
    title: '2x2 CLL',
    tsPath: '2x2/cll.ts',
  },
  {
    exportName: 'twoByTwoEgOneCases',
    imageBase: '2x2-eg-1',
    imageDir: '2x2/eg-1',
    puzzleId: '2x2',
    routeSlug: 'eg-1',
    sourceLabel: 'JPerm 2x2 EG-1',
    sourcePath: '/algs/2x2/eg-1',
    title: '2x2 EG-1',
    tsPath: '2x2/egOne.ts',
  },
  {
    exportName: 'fourByFourOllCases',
    imageBase: '4x4-oll',
    imageDir: '4x4/oll',
    puzzleId: '4x4',
    routeSlug: 'oll',
    sourceLabel: 'JPerm 4x4 OLL',
    sourcePath: '/algs/4x4/oll',
    title: '4x4 OLL',
    tsPath: '4x4/oll.ts',
  },
  {
    exportName: 'fourByFourPllCases',
    imageBase: '4x4-pll',
    imageDir: '4x4/pll',
    puzzleId: '4x4',
    routeSlug: 'pll',
    sourceLabel: 'JPerm 4x4 PLL',
    sourcePath: '/algs/4x4/pll',
    title: '4x4 PLL',
    tsPath: '4x4/pll.ts',
  },
]

const requestedKeys = process.argv.slice(2)
const selectedSets = requestedKeys.length === 0
  ? sets
  : sets.filter((set) => requestedKeys.includes(setKey(set)))

if (selectedSets.length === 0) {
  throw new Error(`No matching sets for: ${requestedKeys.join(', ')}`)
}

for (const set of selectedSets) {
  importSet(set)
}

function importSet(set) {
  const url = `${sourceBase}${set.sourcePath}`
  const html = renderPage(url)
  const document = new JSDOM(html).window.document
  const rows = [...document.querySelectorAll('#main-algTable-container .tbody > .tr')]
  const outputDir = join(repoRoot, 'apps/web/public/algorithms', set.imageDir)
  const fileSlugCounts = new Map()
  const cases = rows.map((row, index) => extractCase(row, set, outputDir, index, fileSlugCounts)).filter((item) => item !== undefined)

  if (cases.length === 0) {
    throw new Error(`${set.title}: no cases extracted from ${url}`)
  }

  writeSetFile(set, cases)
  console.log(`${set.title}: ${cases.length} cases`)
}

function renderPage(url) {
  const result = spawnSync(
    'google-chrome',
    [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--virtual-time-budget=12000',
      '--dump-dom',
      url,
    ],
    { encoding: 'utf8', maxBuffer: 1024 * 1024 * 64 },
  )

  if (result.status !== 0) {
    throw new Error(result.stderr)
  }

  return result.stdout
}

function extractCase(row, set, outputDir, index, fileSlugCounts) {
  const name = cleanText(row.querySelector('.td.name .td-text')?.textContent)
  const algorithm = cleanText(row.querySelector('.td.alg .td-text')?.textContent)
  const imageSrc = row.querySelector('.td.img img')?.getAttribute('src')

  if (name === undefined || algorithm === undefined || imageSrc === undefined) {
    return undefined
  }

  if (!imageSrc.startsWith('data:image/png;base64,')) {
    throw new Error(`${set.title} ${name}: image is not embedded PNG data`)
  }

  mkdirSync(outputDir, { recursive: true })
  const fileName = `${set.imageBase}-${uniqueCaseFileSlug(name, index, fileSlugCounts)}.png`
  const filePath = join(outputDir, fileName)
  const image = Buffer.from(imageSrc.slice('data:image/png;base64,'.length), 'base64')
  writeFileSync(filePath, image)

  return {
    algorithm,
    image: `/algorithms/${set.imageDir}/${fileName}`,
    name,
  }
}

function writeSetFile(set, cases) {
  const modulePath = set.tsPath.replace(/\.ts$/, '')
  const tsPath = join(repoRoot, 'apps/web/src/pages/AlgorithmsPage/sets', modulePath, `${basename(modulePath)}.ts`)
  mkdirSync(dirname(tsPath), { recursive: true })
  const lines = [
    `import type { AlgorithmCase } from '${typeImportPath(set.tsPath)}'`,
    '',
    `export const ${set.exportName}: AlgorithmCase[] = [`,
    ...cases.map((caseItem) => `  ${formatObject(caseItem)},`),
    ']',
    '',
  ]
  writeFileSync(tsPath, lines.join('\n'))
  writeFileSync(join(dirname(tsPath), 'index.ts'), `export * from './${basename(modulePath)}'\n`)
}

function typeImportPath(tsPath) {
  const depth = tsPath.replace(/\.ts$/, '').split('/').length
  return `${'../'.repeat(depth)}types`
}

function formatObject(caseItem) {
  return `{ name: ${JSON.stringify(caseItem.name)}, image: ${JSON.stringify(caseItem.image)}, algorithm: ${JSON.stringify(caseItem.algorithm)} }`
}

function caseFileSlug(name, index) {
  const rawSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return rawSlug === '' ? String(index + 1).padStart(2, '0') : rawSlug
}

function uniqueCaseFileSlug(name, index, fileSlugCounts) {
  const fileSlug = caseFileSlug(name, index)
  const count = fileSlugCounts.get(fileSlug) ?? 0
  fileSlugCounts.set(fileSlug, count + 1)
  return count === 0 ? fileSlug : `${fileSlug}-${count + 1}`
}

function cleanText(value) {
  const text = value?.replace(/\s+/g, ' ').trim()
  return text === '' ? undefined : text
}

function setKey(set) {
  return `${set.puzzleId}/${set.routeSlug}`
}
