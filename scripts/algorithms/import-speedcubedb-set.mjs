import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { basename, dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const sourceBase = 'https://speedcubedb.com'

const sets = [
  set('3x3', 'f2l', '3x3 F2L', 'SpeedCubeDB F2L', '/a/3x3/F2L', '3x3/f2l.ts', 'threeByThreeF2lCases', '3x3/f2l', ['3x3/F2L']),
  set('3x3', 'advanced-f2l', '3x3 Advanced F2L', 'SpeedCubeDB Advanced F2L', '/a/3x3/AdvancedF2L', '3x3/advancedF2l.ts', 'threeByThreeAdvancedF2lCases', '3x3/advanced-f2l', ['3x3/AdvancedF2L']),
  set('2x2', 'eg-2', '2x2 EG-2', 'SpeedCubeDB 2x2 EG-2', '/a/2x2/EG2', '2x2/egTwo.ts', 'twoByTwoEgTwoCases', '2x2/eg-2', ['2x2/EG2']),
  set('3x3', 'zbll-t', '3x3 ZBLL T', 'SpeedCubeDB ZBLL T', '/a/3x3/ZBLLT', '3x3/zbllT.ts', 'threeByThreeZbllTCases', '3x3/zbll-t', ['3x3/ZBLLT']),
  set('3x3', 'zbll-u', '3x3 ZBLL U', 'SpeedCubeDB ZBLL U', '/a/3x3/ZBLLU', '3x3/zbllU.ts', 'threeByThreeZbllUCases', '3x3/zbll-u', ['3x3/ZBLLU']),
  set('3x3', 'zbll-l', '3x3 ZBLL L', 'SpeedCubeDB ZBLL L', '/a/3x3/ZBLLL', '3x3/zbllL.ts', 'threeByThreeZbllLCases', '3x3/zbll-l', ['3x3/ZBLLL']),
  set('3x3', 'zbll-sune', '3x3 ZBLL Sune', 'SpeedCubeDB ZBLL Sune', '/a/3x3/ZBLLS', '3x3/zbllSune.ts', 'threeByThreeZbllSuneCases', '3x3/zbll-sune', ['3x3/ZBLLS']),
  set('3x3', 'zbll-antisune', '3x3 ZBLL Antisune', 'SpeedCubeDB ZBLL Antisune', '/a/3x3/ZBLLAS', '3x3/zbllAntisune.ts', 'threeByThreeZbllAntisuneCases', '3x3/zbll-antisune', ['3x3/ZBLLAS']),
  set('3x3', 'zbll-pi', '3x3 ZBLL Pi', 'SpeedCubeDB ZBLL Pi', '/a/3x3/ZBLLPi', '3x3/zbllPi.ts', 'threeByThreeZbllPiCases', '3x3/zbll-pi', ['3x3/ZBLLPi']),
  set('3x3', 'zbll-h', '3x3 ZBLL H', 'SpeedCubeDB ZBLL H', '/a/3x3/ZBLLH', '3x3/zbllH.ts', 'threeByThreeZbllHCases', '3x3/zbll-h', ['3x3/ZBLLH']),
  set('3x3', 'vls-ub', '3x3 VLS UB', 'SpeedCubeDB VLS UB', '/a/3x3/VLSUB', '3x3/vlsUb.ts', 'threeByThreeVlsUbCases', '3x3/vls-ub', ['3x3/VLSUB']),
  set('3x3', 'vls-ub-ul', '3x3 VLS UB UL', 'SpeedCubeDB VLS UB UL', '/a/3x3/VLSUBUL', '3x3/vlsUbUl.ts', 'threeByThreeVlsUbUlCases', '3x3/vls-ub-ul', ['3x3/VLSUBUL']),
  set('3x3', 'vls-uf', '3x3 VLS UF', 'SpeedCubeDB VLS UF', '/a/3x3/VLSUF', '3x3/vlsUf.ts', 'threeByThreeVlsUfCases', '3x3/vls-uf', ['3x3/VLSUF']),
  set('3x3', 'vls-uf-ub', '3x3 VLS UF UB', 'SpeedCubeDB VLS UF UB', '/a/3x3/VLSUFUB', '3x3/vlsUfUb.ts', 'threeByThreeVlsUfUbCases', '3x3/vls-uf-ub', ['3x3/VLSUFUB']),
  set('3x3', 'vls-uf-ul', '3x3 VLS UF UL', 'SpeedCubeDB VLS UF UL', '/a/3x3/VLSUFUL', '3x3/vlsUfUl.ts', 'threeByThreeVlsUfUlCases', '3x3/vls-uf-ul', ['3x3/VLSUFUL']),
  set('3x3', 'vls-ul', '3x3 VLS UL', 'SpeedCubeDB VLS UL', '/a/3x3/VLSUL', '3x3/vlsUl.ts', 'threeByThreeVlsUlCases', '3x3/vls-ul', ['3x3/VLSUL']),
  set('3x3', 'vls-no-edges', '3x3 VLS No Edges', 'SpeedCubeDB VLS No Edges', '/a/3x3/VLSNE', '3x3/vlsNoEdges.ts', 'threeByThreeVlsNoEdgesCases', '3x3/vls-no-edges', ['3x3/VLSNE']),
  set('sq1', 'cubeshape', 'Square-1 Cubeshape', 'SpeedCubeDB Square-1 Cubeshape', '/a/SQ1/SQ1CS', 'sq1/cubeshape.ts', 'squareOneCubeshapeCases', 'sq1/cubeshape', ['SQ1/SQ1CS']),
  set('sq1', 'cp', 'Square-1 CP', 'SpeedCubeDB Square-1 CP', '/a/SQ1/SQ1CP', 'sq1/cp.ts', 'squareOneCpCases', 'sq1/cp', ['SQ1/SQ1CP']),
  set('sq1', 'ep', 'Square-1 EP', 'SpeedCubeDB Square-1 EP', '/a/SQ1/SQ1EP', 'sq1/ep.ts', 'squareOneEpCases', 'sq1/ep', ['SQ1/SQ1EP']),
  set('sq1', 'parity', 'Square-1 Parity', 'SpeedCubeDB Square-1 Parity', '/a/SQ1/SQ1Parity', 'sq1/parity.ts', 'squareOneParityCases', 'sq1/parity', ['SQ1/SQ1Parity']),
  set('pyraminx', 'l4e', 'Pyraminx L4E', 'SpeedCubeDB Pyraminx L4E', '/a/Pyraminx/L4E', 'pyraminx/l4e.ts', 'pyraminxL4eCases', 'pyraminx/l4e', ['Pyraminx/L4E']),
  set('pyraminx', 'l3e', 'Pyraminx L3E', 'SpeedCubeDB Pyraminx L3E', '/a/Pyraminx/L3E', 'pyraminx/l3e.ts', 'pyraminxL3eCases', 'pyraminx/l3e', ['Pyraminx/L3E']),
  set('megaminx', 'oll', 'Megaminx OLL', 'SpeedCubeDB Megaminx OLL', '/a/Megaminx/MegaminxOLL', 'megaminx/oll.ts', 'megaminxOllCases', 'megaminx/oll', numberedSources('Megaminx/MegaminxOLL', 1, 37), { render: false }),
  set('megaminx', 'pll', 'Megaminx PLL', 'SpeedCubeDB Megaminx PLL', '/a/Megaminx/MegaminxPLL', 'megaminx/pll.ts', 'megaminxPllCases', 'megaminx/pll', letterSources('Megaminx/MegaminxPLL'), { render: false, allowEmptySources: true }),
  set('megaminx', 'eo', 'Megaminx EO', 'SpeedCubeDB Megaminx EO', '/a/Megaminx/MegaminxEO', 'megaminx/eo.ts', 'megaminxEoCases', 'megaminx/eo', ['Megaminx/MegaminxEO'], { render: false }),
  set('megaminx', 'co', 'Megaminx CO', 'SpeedCubeDB Megaminx CO', '/a/Megaminx/MegaminxCO', 'megaminx/co.ts', 'megaminxCoCases', 'megaminx/co', ['Megaminx/MegaminxCO'], { render: false }),
  set('megaminx', 'ep', 'Megaminx EP', 'SpeedCubeDB Megaminx EP', '/a/Megaminx/MegaminxEP', 'megaminx/ep.ts', 'megaminxEpCases', 'megaminx/ep', ['Megaminx/MegaminxEP'], { render: false }),
  set('megaminx', 'cp', 'Megaminx CP', 'SpeedCubeDB Megaminx CP', '/a/Megaminx/MegaminxCP', 'megaminx/cp.ts', 'megaminxCpCases', 'megaminx/cp', ['Megaminx/MegaminxCP'], { render: false }),
  set('4x4', 'oll-parity', '4x4 OLL Parity', 'SpeedCubeDB 4x4 OLL Parity', '/a/4x4/OLLParity', '4x4/ollParity.ts', 'fourByFourOllParityCases', '4x4/oll-parity', ['4x4/OLLParity']),
  set('4x4', 'pll-parity', '4x4 PLL Parity', 'SpeedCubeDB 4x4 PLL Parity', '/a/4x4/PLLParity', '4x4/pllParity.ts', 'fourByFourPllParityCases', '4x4/pll-parity', ['4x4/PLLParity']),
  set('5x5', 'l2e', '5x5 L2E', 'SpeedCubeDB 5x5 L2E', '/a/5x5/L2E', '5x5/l2e.ts', 'fiveByFiveL2eCases', '5x5/l2e', ['5x5/L2E']),
  set('5x5', 'l2c', '5x5 L2C', 'SpeedCubeDB 5x5 L2C', '/a/5x5/L2C', '5x5/l2c.ts', 'fiveByFiveL2cCases', '5x5/l2c', ['5x5/L2C']),
  set('6x6', 'l2e', '6x6 L2E', 'SpeedCubeDB 6x6 L2E', '/a/6x6/6x6L2E', '6x6/l2e.ts', 'sixBySixL2eCases', '6x6/l2e', ['6x6/6x6L2E']),
  set('6x6', 'l2c', '6x6 L2C', 'SpeedCubeDB 6x6 L2C', '/a/6x6/6x6L2C', '6x6/l2c.ts', 'sixBySixL2cCases', '6x6/l2c', ['6x6/6x6L2C']),
]

const requestedKeys = process.argv.slice(2)
const selectedSets = requestedKeys.length === 0
  ? sets
  : sets.filter((set) => requestedKeys.includes(setKey(set)))

if (selectedSets.length === 0) {
  throw new Error(`No matching sets for: ${requestedKeys.join(', ')}`)
}

for (const set of selectedSets) {
  await importSet(set)
}

writeRegistryFile()
writeSummaryFile()

async function importSet(set) {
  const outputDir = join(repoRoot, 'apps/web/public/algorithms', set.imageDir)
  const fileSlugCounts = new Map()
  const cases = []

  for (const sourcePath of set.sources) {
    const url = `${sourceBase}/a/${sourcePath}`
    const html = set.render ? renderPage(url) : await fetchPage(url)
    const document = new JSDOM(html).window.document
    const rows = [...document.querySelectorAll('.row.singlealgorithm')]

    if (rows.length === 0 && !set.allowEmptySources) {
      throw new Error(`${set.title}: no cases extracted from ${url}`)
    }

    for (const row of rows) {
      const caseItem = await extractCase(row, set, outputDir, cases.length, fileSlugCounts)
      if (caseItem !== undefined) {
        cases.push(caseItem)
      }
    }
  }

  if (cases.length === 0) {
    throw new Error(`${set.title}: no cases extracted`)
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
    { encoding: 'utf8', maxBuffer: 1024 * 1024 * 256 },
  )

  if (result.status !== 0) {
    throw new Error(result.stderr)
  }

  return result.stdout
}

async function fetchPage(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`${url}: ${response.status} ${response.statusText}`)
  }

  return response.text()
}

async function extractCase(row, set, outputDir, index, fileSlugCounts) {
  const name = cleanText(row.getAttribute('data-alg'))
  const algorithm = cleanText(row.querySelector('.cubedb-ftw-')?.getAttribute('data-alg'))
    ?? cleanText(row.querySelector('.formatted-alg')?.textContent)
    ?? solvedAlgorithm(row)
  const imageAnchor = row.querySelector('a[data-alg-filter][data-puzzle][data-category]')

  if (name === undefined || algorithm === undefined || imageAnchor === null) {
    return undefined
  }

  mkdirSync(outputDir, { recursive: true })
  const fileBase = `${set.imageBase}-${uniqueCaseFileSlug(name, index, fileSlugCounts)}`
  const image = await writeCaseImage(imageAnchor, outputDir, fileBase)

  if (image === undefined) {
    throw new Error(`${set.title} ${name}: no rendered case image`)
  }

  return {
    algorithm,
    image: `/algorithms/${set.imageDir}/${image}`,
    name,
  }
}

async function writeCaseImage(anchor, outputDir, fileBase) {
  const svgs = [...anchor.querySelectorAll('svg')]

  if (svgs.length > 0) {
    const fileName = `${fileBase}.svg`
    writeFileSync(join(outputDir, fileName), svgImage(svgs))
    return fileName
  }

  const imageSrc = anchor.querySelector('img')?.getAttribute('src')
  if (imageSrc === undefined) {
    return undefined
  }

  const imageUrl = new URL(imageSrc, sourceBase).href
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`${imageUrl}: ${response.status} ${response.statusText}`)
  }

  const ext = imageExtension(imageUrl, response.headers.get('content-type'))
  const fileName = `${fileBase}${ext}`
  const bytes = Buffer.from(await response.arrayBuffer())
  writeFileSync(join(outputDir, fileName), bytes)
  return fileName
}

function svgImage(svgs) {
  if (svgs.length === 1) {
    return ensureSvgNamespace(svgs[0].outerHTML)
  }

  const gap = 8
  const dimensions = svgs.map((svg) => ({
    height: numericAttribute(svg, 'height') ?? 75,
    width: numericAttribute(svg, 'width') ?? 75,
  }))
  const height = Math.max(...dimensions.map((dimension) => dimension.height))
  const width = dimensions.reduce((total, dimension) => total + dimension.width, 0) + gap * (svgs.length - 1)
  let x = 0
  const nestedSvgs = svgs.map((svg, index) => {
    const { height: svgHeight, width: svgWidth } = dimensions[index]
    const y = (height - svgHeight) / 2
    const viewBox = svg.getAttribute('viewBox') ?? `0 0 ${svgWidth} ${svgHeight}`
    const nestedSvg = `<svg x="${x}" y="${y}" width="${svgWidth}" height="${svgHeight}" viewBox="${viewBox}">${svg.innerHTML}</svg>`
    x += svgWidth + gap
    return nestedSvg
  })

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${nestedSvgs.join('')}</svg>`
}

function ensureSvgNamespace(svg) {
  if (svg.includes('xmlns=')) {
    return svg
  }

  return svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')
}

function numericAttribute(element, attribute) {
  const value = Number.parseFloat(element.getAttribute(attribute) ?? '')
  return Number.isFinite(value) ? value : undefined
}

function imageExtension(url, contentType) {
  const pathExtension = extname(new URL(url).pathname).toLowerCase()
  if (['.png', '.jpg', '.jpeg', '.webp', '.svg'].includes(pathExtension)) {
    return pathExtension
  }

  if (contentType?.includes('svg')) {
    return '.svg'
  }

  if (contentType?.includes('jpeg')) {
    return '.jpg'
  }

  if (contentType?.includes('webp')) {
    return '.webp'
  }

  return '.png'
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

function writeRegistryFile() {
  const tsPath = join(repoRoot, 'apps/web/src/pages/AlgorithmsPage/sets/speedCubeDbSets/speedCubeDbSets.ts')
  mkdirSync(dirname(tsPath), { recursive: true })
  const lines = [
    "import type { AlgorithmSet } from '../types'",
    ...sets.map((set) => `import { ${set.exportName} } from '../${set.tsPath.replace(/\.ts$/, '')}'`),
    '',
    "const speedCubeDbBase = 'https://speedcubedb.com'",
    '',
    'export const speedCubeDbAlgorithmSets: AlgorithmSet[] = [',
    ...sets.map((set) => `  ${formatRegistryObject(set)},`),
    ']',
    '',
  ]
  writeFileSync(tsPath, lines.join('\n'))
  writeFileSync(join(dirname(tsPath), 'index.ts'), "export * from './speedCubeDbSets'\n")
}

function writeSummaryFile() {
  const tsPath = join(repoRoot, 'apps/web/src/pages/AlgorithmsPage/sets/speedCubeDbSetSummaries/speedCubeDbSetSummaries.ts')
  mkdirSync(dirname(tsPath), { recursive: true })
  const lines = [
    "import type { AlgorithmSetSummary } from '../types'",
    '',
    "const speedCubeDbBase = 'https://speedcubedb.com'",
    '',
    'export const speedCubeDbSetSummaries: AlgorithmSetSummary[] = [',
    ...sets.map((set) => `  ${formatSummaryObject(set)},`),
    ']',
    '',
  ]
  writeFileSync(tsPath, lines.join('\n'))
  writeFileSync(join(dirname(tsPath), 'index.ts'), "export * from './speedCubeDbSetSummaries'\n")
}

function formatRegistryObject(set) {
  return `{ cases: ${set.exportName}, path: ${JSON.stringify(`/algoritmos/${set.puzzleId}/${set.routeSlug}`)}, puzzleId: ${JSON.stringify(set.puzzleId)}, routeSlug: ${JSON.stringify(set.routeSlug)}, sourceLabel: ${JSON.stringify(set.sourceLabel)}, sourceUrl: \`${'${speedCubeDbBase}'}${set.sourcePath}\`, title: ${JSON.stringify(set.title)} }`
}

function formatSummaryObject(set) {
  return `{ path: ${JSON.stringify(`/algoritmos/${set.puzzleId}/${set.routeSlug}`)}, puzzleId: ${JSON.stringify(set.puzzleId)}, routeSlug: ${JSON.stringify(set.routeSlug)}, sourceLabel: ${JSON.stringify(set.sourceLabel)}, sourceUrl: \`${'${speedCubeDbBase}'}${set.sourcePath}\`, title: ${JSON.stringify(set.title)} }`
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

function solvedAlgorithm(row) {
  const text = cleanText(row.textContent)
  return text?.includes('Solved setup:') ? 'Solved' : undefined
}

function numberedSources(prefix, first, last) {
  return Array.from({ length: last - first + 1 }, (_, index) => `${prefix}${first + index}`)
}

function letterSources(prefix) {
  return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => `${prefix}${letter}`)
}

function set(puzzleId, routeSlug, title, sourceLabel, sourcePath, tsPath, exportName, imageDir, sources, options = {}) {
  return {
    allowEmptySources: options.allowEmptySources ?? false,
    exportName,
    imageBase: routeSlug,
    imageDir,
    puzzleId,
    render: options.render ?? true,
    routeSlug,
    sourceLabel,
    sourcePath,
    sources,
    title,
    tsPath,
  }
}

function setKey(set) {
  return `${set.puzzleId}/${set.routeSlug}`
}
