import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const webRoot = resolve(repoRoot, 'web')
const distDir = resolve(webRoot, 'dist')
const siteOrigin = 'https://speedcube.com.br'
const siteName = 'Speedcube'
const defaultOgImageUrl = `${siteOrigin}/og-default.svg`
const defaultLocale = 'pt-BR'
const seoLocales = ['pt-BR', 'en', 'es', 'it', 'de', 'fr', 'ru', 'zh', 'ja']
const localePrefixes = {
  de: 'de',
  en: 'en',
  es: 'es',
  fr: 'fr',
  it: 'it',
  ja: 'ja',
  'pt-BR': '',
  ru: 'ru',
  zh: 'zh',
}
const copy = {
  de: { algorithms: 'Algorithmen', channels: 'Kanaele', notations: 'Notationen', solver: 'Solver', timer: 'Timer' },
  en: { algorithms: 'Algorithms', channels: 'Channels', notations: 'Notations', solver: 'Solver', timer: 'Timer' },
  es: { algorithms: 'Algoritmos', channels: 'Canales', notations: 'Notaciones', solver: 'Solver', timer: 'Cronometro' },
  fr: { algorithms: 'Algorithmes', channels: 'Chaines', notations: 'Notations', solver: 'Solver', timer: 'Timer' },
  it: { algorithms: 'Algoritmi', channels: 'Canali', notations: 'Notazioni', solver: 'Solver', timer: 'Timer' },
  ja: { algorithms: 'アルゴリズム', channels: 'チャンネル', notations: '記法', solver: 'ソルバー', timer: 'タイマー' },
  'pt-BR': { algorithms: 'Algoritmos', channels: 'Canais', notations: 'Notacoes', solver: 'Solver', timer: 'Cronometro' },
  ru: { algorithms: 'Алгоритмы', channels: 'Каналы', notations: 'Нотации', solver: 'Решатель', timer: 'Таймер' },
  zh: { algorithms: '算法', channels: '频道', notations: '记号', solver: '求解器', timer: '计时器' },
}

const sourceFiles = [
  resolve(webRoot, 'src/pages/AlgorithmsPage/sets/algorithmSetMetadata.ts'),
  resolve(webRoot, 'src/pages/AlgorithmsPage/sets/speedCubeDbSetSummaries.ts'),
  resolve(webRoot, 'src/pages/NotationsPage/notationGuides.ts'),
]

const sourceText = (await Promise.all(sourceFiles.map((file) => readFile(file, 'utf8')))).join('\n')
const titleByPath = extractTitleByPath(sourceText)
const puzzleByPath = extractPuzzleByPath(sourceText)
const indexableBasePaths = indexablePaths(sourceText)
const baseHtml = await readFile(resolve(distDir, 'index.html'), 'utf8')

await writeFile(resolve(distDir, 'sitemap.xml'), sitemap(indexableBasePaths))

for (const path of indexableBasePaths) {
  for (const locale of seoLocales) {
    await writePrerenderedHtml(localizedPath(path, locale), locale)
  }
}

async function writePrerenderedHtml(routePath, locale) {
  const basePath = stripLocalePrefix(routePath)
  const metadata = metadataForPath(basePath, locale)
  const html = prerenderHtml(baseHtml, metadata)
  const outputDir = resolve(distDir, routePath.slice(1))

  await mkdir(outputDir, { recursive: true })
  await writeFile(resolve(outputDir, 'index.html'), html)
}

function indexablePaths(text) {
  const paths = new Set(['/solve', '/timer', '/channels', '/algoritmos'])
  const pathRegex = /path:\s*["']([^"']+)["']/g
  let match = pathRegex.exec(text)

  while (match !== null) {
    paths.add(match[1])
    match = pathRegex.exec(text)
  }

  return [...paths].sort(pathSort)
}

function extractTitleByPath(text) {
  const titles = new Map()
  const objectRegex = /\{[\s\S]*?path:\s*["']([^"']+)["'][\s\S]*?title:\s*["']([^"']+)["'][\s\S]*?\}/g
  let match = objectRegex.exec(text)

  while (match !== null) {
    titles.set(match[1], match[2])
    match = objectRegex.exec(text)
  }

  return titles
}

function extractPuzzleByPath(text) {
  const puzzles = new Map()
  const objectRegex = /\{[\s\S]*?path:\s*["']([^"']+)["'][\s\S]*?puzzle:\s*["']([^"']+)["'][\s\S]*?\}/g
  let match = objectRegex.exec(text)

  while (match !== null) {
    puzzles.set(match[1], match[2])
    match = objectRegex.exec(text)
  }

  return puzzles
}

function pathSort(a, b) {
  const depth = a.split('/').length - b.split('/').length

  return depth === 0 ? a.localeCompare(b) : depth
}

function metadataForPath(path, locale) {
  const title = titleForPath(path, locale)
  const description = descriptionForPath(path, locale)
  const breadcrumbs = breadcrumbsForPath(path, locale)
  const itemList = itemListForPath(path)

  return {
    breadcrumbs,
    canonicalUrl: `${siteOrigin}${localizedPath(path, locale)}`,
    description,
    htmlLang: locale,
    itemList,
    jsonLd: jsonLdForPath(path, locale, title, description, breadcrumbs, itemList),
    locale,
    path,
    title: `${title} | ${siteName}`,
  }
}

function titleForPath(path, locale) {
  if (path === '/solve') {
    const titles = {
      de: 'Online Rubik Cube Solver',
      en: 'Online Rubik\'s Cube Solver',
      es: 'Solver de Cubo Rubik Online',
      fr: 'Solver Rubik Cube en Ligne',
      it: 'Solver Cubo di Rubik Online',
      ja: 'オンライン ルービックキューブ ソルバー',
      'pt-BR': 'Solver de Cubo Magico Online',
      ru: 'Онлайн-решатель кубика Рубика',
      zh: '在线魔方求解器',
    }

    return titles[locale]
  }

  if (path === '/timer') {
    return locale === 'pt-BR' || locale === 'es' ? 'Cronometro de Speedcubing' : 'Speedcubing Timer'
  }

  if (path === '/channels') {
    return `${copy[locale].channels} YouTube Cubing`
  }

  if (path === '/algoritmos') {
    return locale === 'en' ? 'Rubik\'s Cube Algorithms' : copy[locale].algorithms
  }

  if (path.startsWith('/algoritmos/')) {
    const title = titleByPath.get(path) ?? path.split('/').at(-1)
    return locale === 'en' ? `${title} Algorithms` : `${copy[locale].algorithms} ${title}`
  }

  if (path.startsWith('/notations/')) {
    const puzzle = puzzleByPath.get(path) ?? path.split('/').at(-1)
    return locale === 'en' ? `${puzzle} Notation Guide` : `${copy[locale].notations} ${puzzle}`
  }

  return siteName
}

function descriptionForPath(path, locale) {
  if (path === '/solve') {
    const descriptions = {
      de: 'Loese unterstuetzte Rubik-Cube-Scrambles online mit Rust-Solver, Zugwiedergabe und Cube-Visualisierung.',
      en: 'Solve supported Rubik\'s Cube scrambles online with a Rust-powered solver, move playback, and cube visualization.',
      es: 'Resuelve scrambles de cubo Rubik online con solver en Rust, reproduccion de movimientos y visualizacion del cubo.',
      fr: 'Resoudre des scrambles de Rubik Cube en ligne avec un solver Rust, lecture des mouvements et visualisation du cube.',
      it: 'Risolvi scramble del Cubo di Rubik online con solver Rust, playback mosse e visualizzazione del cubo.',
      ja: 'Rust 製ソルバー、手順再生、キューブ表示で対応パズルのスクランブルをオンラインで解けます。',
      'pt-BR': 'Resolva scrambles de cubo magico online com solver em Rust, reproducao de movimentos e visualizacao do cubo.',
      ru: 'Решайте поддерживаемые скрамблы онлайн с Rust-решателем, воспроизведением ходов и визуализацией куба.',
      zh: '使用 Rust 驱动的求解器、步骤回放和魔方可视化在线求解支持的打乱。',
    }

    return descriptions[locale]
  }

  if (path === '/timer') {
    return timerDescription(locale)
  }

  if (path === '/channels') {
    return channelsDescription(locale)
  }

  if (path === '/algoritmos') {
    return algorithmsDescription(locale)
  }

  if (path.startsWith('/algoritmos/')) {
    const title = titleByPath.get(path) ?? path.split('/').at(-1)
    return algorithmDescription(title, locale)
  }

  if (path.startsWith('/notations/')) {
    const puzzle = puzzleByPath.get(path) ?? path.split('/').at(-1)
    return notationDescription(puzzle, locale)
  }

  return 'Speedcube.'
}

function timerDescription(locale) {
  return {
    de: 'Trainiere Speedcubing mit Timer, Scrambles, Inspektion, Session-Durchschnitten und Solve-Historie.',
    en: 'Practice speedcubing with a focused timer, generated scrambles, inspection, session averages, and solve history.',
    es: 'Practica speedcubing con cronometro, scrambles generados, inspeccion, medias de sesion e historial de solves.',
    fr: 'Entrainez-vous au speedcubing avec timer, scrambles, inspection, moyennes de session et historique.',
    it: 'Pratica speedcubing con timer, scramble generati, ispezione, medie sessione e storico solve.',
    ja: 'スクランブル、インスペクション、セッション平均、履歴つきのスピードキューブ用タイマーです。',
    'pt-BR': 'Treine speedcubing com cronometro, scrambles gerados, inspecao, medias de sessao e historico de solves.',
    ru: 'Тренируйте спидкубинг с таймером, скрамблами, инспекцией, средними и историей сборок.',
    zh: '使用打乱、观察、分组平均和还原历史来练习速拧。',
  }[locale]
}

function channelsDescription(locale) {
  return {
    de: 'Entdecke Cubing-YouTube-Kanaele fuer Tutorials, Speedcubing, Reviews und Puzzle-Lernen.',
    en: 'Discover cubing YouTube channels for tutorials, speedcubing walkthroughs, reviews, and puzzle learning.',
    es: 'Descubre canales de YouTube de cubing con tutoriales, speedcubing, reseñas y aprendizaje de puzzles.',
    fr: 'Decouvrez des chaines YouTube de cubing pour tutoriels, speedcubing, avis et apprentissage des puzzles.',
    it: 'Scopri canali YouTube di cubing per tutorial, speedcubing, recensioni e apprendimento puzzle.',
    ja: 'チュートリアル、スピードキューブ、レビュー、学習に役立つキューブ系 YouTube チャンネルを見つけましょう。',
    'pt-BR': 'Conheca canais de cubo magico no YouTube com tutoriais, speedcubing, reviews e aprendizado de puzzles.',
    ru: 'YouTube-каналы о кубинге: обучение, спидкубинг, обзоры и изучение головоломок.',
    zh: '发现用于教程、速拧、评测和学习的魔方 YouTube 频道。',
  }[locale]
}

function algorithmsDescription(locale) {
  return {
    de: 'Durchsuche Speedcubing-Algorithmen fuer 2x2, 3x3, Big Cubes, Pyraminx, Megaminx, Square-1 und mehr.',
    en: 'Browse speedcubing algorithm sets for 2x2, 3x3, big cubes, Pyraminx, Megaminx, Square-1, and more.',
    es: 'Explora algoritmos de speedcubing para 2x2, 3x3, cubos grandes, Pyraminx, Megaminx, Square-1 y mas.',
    fr: 'Parcourez des algorithmes de speedcubing pour 2x2, 3x3, grands cubes, Pyraminx, Megaminx, Square-1 et plus.',
    it: 'Sfoglia set di algoritmi speedcubing per 2x2, 3x3, big cube, Pyraminx, Megaminx, Square-1 e altro.',
    ja: '2x2、3x3、多分割キューブ、Pyraminx、Megaminx、Square-1 などのスピードキューブ用アルゴリズムを閲覧できます。',
    'pt-BR': 'Explore algoritmos de speedcubing para 2x2, 3x3, cubos grandes, Pyraminx, Megaminx, Square-1 e mais.',
    ru: 'Алгоритмы для 2x2, 3x3, больших кубов, Pyraminx, Megaminx, Square-1 и других головоломок.',
    zh: '浏览 2x2、3x3、高阶魔方、Pyraminx、Megaminx、Square-1 等速拧算法。',
  }[locale]
}

function algorithmDescription(title, locale) {
  return {
    de: `${title}-Algorithmen fuer Speedcubing-Training, Erkennung und Loesungsablaeufe.`,
    en: `${title} algorithms for speedcubing practice, recognition, and solving workflows.`,
    es: `Algoritmos ${title} para practica de speedcubing, reconocimiento y flujos de solucion.`,
    fr: `Algorithmes ${title} pour l'entrainement speedcubing, la reconnaissance et les flux de resolution.`,
    it: `Algoritmi ${title} per pratica speedcubing, riconoscimento e flussi di soluzione.`,
    ja: `${title} のスピードキューブ練習、認識、解法フロー向けアルゴリズム。`,
    'pt-BR': `Algoritmos ${title} para treino de speedcubing, reconhecimento e fluxos de solucao.`,
    ru: `Алгоритмы ${title} для тренировки спидкубинга, распознавания и решения.`,
    zh: `${title} 算法，用于速拧练习、识别和还原流程。`,
  }[locale]
}

function notationDescription(puzzle, locale) {
  return {
    de: `Lerne ${puzzle}-Notation mit Symbolen, Beispielen und praktischen Speedcubing-Referenzen.`,
    en: `Learn ${puzzle} notation with move symbols, examples, and practical speedcubing references.`,
    es: `Aprende notacion ${puzzle} con simbolos de movimientos, ejemplos y referencias practicas de speedcubing.`,
    fr: `Apprenez la notation ${puzzle} avec symboles, exemples et references pratiques de speedcubing.`,
    it: `Impara la notazione ${puzzle} con simboli, esempi e riferimenti pratici di speedcubing.`,
    ja: `${puzzle} の記法を、記号、例、実用的なスピードキューブ参照で学べます。`,
    'pt-BR': `Aprenda notacao ${puzzle} com simbolos de movimentos, exemplos e referencias praticas de speedcubing.`,
    ru: `Изучайте нотацию ${puzzle}: символы ходов, примеры и практические материалы для спидкубинга.`,
    zh: `学习 ${puzzle} 记号，包括转动符号、示例和实用速拧参考。`,
  }[locale]
}

function breadcrumbsForPath(path, locale) {
  if (path.startsWith('/algoritmos/')) {
    const segments = path.split('/').filter(Boolean)
    const puzzlePath = `/${segments.slice(0, 2).join('/')}`
    const breadcrumbs = [
      { name: copy[locale].algorithms, path: '/algoritmos' },
      { name: titleByPath.get(puzzlePath) ?? segments[1], path: puzzlePath },
    ]

    if (segments.length > 2) {
      breadcrumbs.push({ name: titleByPath.get(path) ?? segments[2], path })
    }

    return breadcrumbs
  }

  if (path.startsWith('/notations/')) {
    return [
      { name: copy[locale].notations, path: '/notations/3x3' },
      { name: puzzleByPath.get(path) ?? path.split('/').at(-1), path },
    ]
  }

  const labels = {
    '/algoritmos': copy[locale].algorithms,
    '/channels': copy[locale].channels,
    '/solve': copy[locale].solver,
    '/timer': copy[locale].timer,
  }

  return [{ name: labels[path] ?? siteName, path }]
}

function itemListForPath(path) {
  if (path === '/algoritmos') {
    return [...titleByPath]
      .filter(([itemPath]) => itemPath.split('/').length === 3 && itemPath.startsWith('/algoritmos/'))
      .map(([itemPath, name]) => ({ name, path: itemPath }))
  }

  const algorithmPuzzleMatch = path.match(/^\/algoritmos\/([^/]+)$/)
  if (algorithmPuzzleMatch !== null) {
    const prefix = `${path}/`
    return [...titleByPath]
      .filter(([itemPath]) => itemPath.startsWith(prefix))
      .map(([itemPath, name]) => ({ name, path: itemPath }))
  }

  return undefined
}

function jsonLdForPath(path, locale, title, description, breadcrumbs, itemList) {
  const graph = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      inLanguage: locale,
      name: siteName,
      url: siteOrigin,
    },
  ]

  if (breadcrumbs.length > 1) {
    graph.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((item, index) => ({
        '@type': 'ListItem',
        item: `${siteOrigin}${localizedPath(item.path, locale)}`,
        name: item.name,
        position: index + 1,
      })),
    })
  }

  if (path === '/solve') {
    graph.push({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      applicationCategory: 'GameApplication',
      description,
      image: defaultOgImageUrl,
      inLanguage: seoLocales,
      name: title,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
      operatingSystem: 'Web',
      url: `${siteOrigin}${localizedPath(path, locale)}`,
    })
  }

  if (itemList !== undefined) {
    graph.push({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListElement: itemList.map((item, index) => ({
        '@type': 'ListItem',
        item: `${siteOrigin}${localizedPath(item.path, locale)}`,
        name: item.name,
        position: index + 1,
      })),
      name: title,
    })
  }

  if (path.startsWith('/notations/')) {
    graph.push({
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      description,
      headline: title,
      image: defaultOgImageUrl,
      inLanguage: locale,
      url: `${siteOrigin}${localizedPath(path, locale)}`,
    })
  }

  return graph
}

function prerenderHtml(html, metadata) {
  const headTags = [
    `<link rel="canonical" href="${escapeHtml(metadata.canonicalUrl)}" />`,
    ...seoLocales.map((locale) => `<link rel="alternate" hreflang="${locale}" href="${escapeHtml(`${siteOrigin}${localizedPath(metadata.path, locale)}`)}" />`),
    `<link rel="alternate" hreflang="x-default" href="${escapeHtml(`${siteOrigin}${metadata.path}`)}" />`,
    `<meta name="robots" content="index,follow" />`,
    `<meta property="og:site_name" content="${siteName}" />`,
    '<meta property="og:type" content="website" />',
    `<meta property="og:title" content="${escapeHtml(metadata.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(metadata.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(metadata.canonicalUrl)}" />`,
    `<meta property="og:image" content="${escapeHtml(defaultOgImageUrl)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(metadata.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(metadata.description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(defaultOgImageUrl)}" />`,
    ...metadata.jsonLd.map((jsonLd) => `<script type="application/ld+json">${escapeScript(JSON.stringify(jsonLd))}</script>`),
  ].join('\n    ')

  return html
    .replace(/<html lang="[^"]*">/, `<html lang="${metadata.htmlLang}">`)
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(metadata.title)}</title>`)
    .replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/>/, `<meta name="description" content="${escapeHtml(metadata.description)}" />`)
    .replace('</head>', `    ${headTags}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${staticBody(metadata)}</div>`)
}

function staticBody(metadata) {
  const breadcrumbHtml = metadata.breadcrumbs.length > 1
    ? `<nav aria-label="Breadcrumb"><ol>${metadata.breadcrumbs.map((item) => `<li><a href="${localizedPath(item.path, metadata.locale)}">${escapeHtml(item.name)}</a></li>`).join('')}</ol></nav>`
    : ''
  const listHtml = metadata.itemList === undefined
    ? ''
    : `<ul>${metadata.itemList.slice(0, 30).map((item) => `<li><a href="${localizedPath(item.path, metadata.locale)}">${escapeHtml(item.name)}</a></li>`).join('')}</ul>`

  return `<main><section><p>${siteName}</p><h1>${escapeHtml(metadata.title.replace(` | ${siteName}`, ''))}</h1><p>${escapeHtml(metadata.description)}</p>${breadcrumbHtml}${listHtml}</section></main>`
}

function sitemap(paths) {
  const entries = []

  for (const path of paths) {
    for (const locale of seoLocales) {
      entries.push(sitemapEntry(path, locale))
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
</urlset>
`
}

function sitemapEntry(path, locale) {
  const loc = `${siteOrigin}${localizedPath(path, locale)}`
  const ptUrl = `${siteOrigin}${localizedPath(path, defaultLocale)}`
  const alternates = seoLocales
    .map((alternateLocale) => `    <xhtml:link rel="alternate" hreflang="${alternateLocale}" href="${escapeXml(`${siteOrigin}${localizedPath(path, alternateLocale)}`)}" />`)
    .join('\n')

  return `  <url>
    <loc>${escapeXml(loc)}</loc>
${alternates}
    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(ptUrl)}" />
  </url>`
}

function localizedPath(path, locale) {
  const prefix = localePrefixes[locale]

  if (prefix !== '') {
    return path === '/' ? `/${prefix}` : `/${prefix}${path}`
  }

  return path
}

function stripLocalePrefix(path) {
  for (const locale of seoLocales) {
    const prefix = localePrefixes[locale]

    if (prefix !== '' && path === `/${prefix}`) {
      return '/'
    }

    if (prefix !== '' && path.startsWith(`/${prefix}/`)) {
      return path.slice(prefix.length + 1)
    }
  }

  return path
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function escapeXml(value) {
  return escapeHtml(value).replaceAll("'", '&apos;')
}

function escapeScript(value) {
  return value.replaceAll('</script', '<\\/script')
}
