import { algorithmPuzzles, algorithmSetSummaries, getAlgorithmPuzzle, setsForPuzzle } from '@pages/AlgorithmsPage/sets/algorithmSetMetadata'
import { getNotationGuide, notationGuides } from '@pages/NotationsPage/notationGuides'

export const seoLocales = ['pt-BR', 'en', 'es', 'it', 'de', 'fr', 'ru', 'zh', 'ja'] as const
export type SeoLocale = (typeof seoLocales)[number]

export type SeoBreadcrumb = {
  name: string
  path: string
}

export type SeoItem = {
  name: string
  path: string
}

export type SeoMetadata = {
  breadcrumbs: SeoBreadcrumb[]
  canonicalUrl: string
  description: string
  htmlLang: SeoLocale
  itemList?: SeoItem[]
  jsonLdKind?: 'web-application' | 'item-list' | 'tech-article'
  locale: SeoLocale
  noindex: boolean
  path: string
  title: string
}

type SeoCopy = {
  algorithmPuzzleDescription: (puzzle: string) => string
  algorithmSetDescription: (set: string) => string
  algorithmSetTitle: (set: string) => string
  algorithms: string
  algorithmsDescription: string
  algorithmsTitle: string
  channels: string
  channelsDescription: string
  channelsTitle: string
  home: string
  notationDescription: (puzzle: string) => string
  notationTitle: (puzzle: string) => string
  notations: string
  notFoundDescription: string
  notFoundTitle: string
  puzzleAlgorithmsTitle: (puzzle: string) => string
  solver: string
  solverDescription: string
  solverTitle: string
  timer: string
  timerDescription: string
  timerTitle: string
}

export const siteOrigin = 'https://speedcube.com.br'
export const siteName = 'Speedcube'
export const defaultLocale: SeoLocale = 'pt-BR'
export const defaultSeoPath = '/solve'
export const defaultOgImageUrl = `${siteOrigin}/og-default.svg`

const localePrefixes: Record<SeoLocale, string> = {
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

export const prefixedSeoLocales = seoLocales.filter((locale) => locale !== defaultLocale)

const copy: Record<SeoLocale, SeoCopy> = {
  de: {
    algorithmPuzzleDescription: (puzzle) => `Durchsuche ${puzzle}-Algorithmen fuer Speedcubing-Training, Erkennung und Ausfuehrung.`,
    algorithmSetDescription: (set) => `${set}-Algorithmen fuer Speedcubing-Training, Erkennung und Loesungsablaeufe.`,
    algorithmSetTitle: (set) => `${set} Algorithmen`,
    algorithms: 'Algorithmen',
    algorithmsDescription: 'Durchsuche Speedcubing-Algorithmen fuer 2x2, 3x3, Big Cubes, Pyraminx, Megaminx, Square-1 und mehr.',
    algorithmsTitle: 'Rubik Cube Algorithmen',
    channels: 'Kanaele',
    channelsDescription: 'Entdecke Cubing-YouTube-Kanaele fuer Tutorials, Speedcubing, Reviews und Puzzle-Lernen.',
    channelsTitle: 'Cubing YouTube Kanaele',
    home: 'Speedcube',
    notationDescription: (puzzle) => `Lerne ${puzzle}-Notation mit Symbolen, Beispielen und praktischen Speedcubing-Referenzen.`,
    notationTitle: (puzzle) => `${puzzle} Notationsguide`,
    notations: 'Notationen',
    notFoundDescription: 'Diese Speedcube-Seite wurde nicht gefunden.',
    notFoundTitle: 'Seite nicht gefunden',
    puzzleAlgorithmsTitle: (puzzle) => `${puzzle} Algorithmen`,
    solver: 'Solver',
    solverDescription: 'Loese unterstuetzte Rubik-Cube-Scrambles online mit Rust-Solver, Zugwiedergabe und Cube-Visualisierung.',
    solverTitle: 'Online Rubik Cube Solver',
    timer: 'Timer',
    timerDescription: 'Trainiere Speedcubing mit Timer, Scrambles, Inspektion, Session-Durchschnitten und Solve-Historie.',
    timerTitle: 'Speedcubing Timer',
  },
  en: {
    algorithmPuzzleDescription: (puzzle) => `Browse ${puzzle} algorithm sets for speedcubing practice, recognition, and move execution.`,
    algorithmSetDescription: (set) => `${set} algorithms for speedcubing practice, recognition, and solving workflows.`,
    algorithmSetTitle: (set) => `${set} Algorithms`,
    algorithms: 'Algorithms',
    algorithmsDescription: 'Browse speedcubing algorithm sets for 2x2, 3x3, big cubes, Pyraminx, Megaminx, Square-1, and more.',
    algorithmsTitle: "Rubik's Cube Algorithms",
    channels: 'Channels',
    channelsDescription: 'Discover cubing YouTube channels for tutorials, speedcubing walkthroughs, reviews, and puzzle learning.',
    channelsTitle: 'Cubing YouTube Channels',
    home: 'Speedcube',
    notationDescription: (puzzle) => `Learn ${puzzle} notation with move symbols, examples, and practical speedcubing references.`,
    notationTitle: (puzzle) => `${puzzle} Notation Guide`,
    notations: 'Notations',
    notFoundDescription: 'This Speedcube page could not be found.',
    notFoundTitle: 'Page not found',
    puzzleAlgorithmsTitle: (puzzle) => `${puzzle} Algorithms`,
    solver: 'Solver',
    solverDescription: "Solve supported Rubik's Cube scrambles online with a Rust-powered solver, move playback, and cube visualization.",
    solverTitle: "Online Rubik's Cube Solver",
    timer: 'Timer',
    timerDescription: 'Practice speedcubing with a focused timer, generated scrambles, inspection, session averages, and solve history.',
    timerTitle: 'Speedcubing Timer',
  },
  es: {
    algorithmPuzzleDescription: (puzzle) => `Explora algoritmos de ${puzzle} para practica de speedcubing, reconocimiento y ejecucion de movimientos.`,
    algorithmSetDescription: (set) => `Algoritmos ${set} para practica de speedcubing, reconocimiento y flujos de solucion.`,
    algorithmSetTitle: (set) => `Algoritmos ${set}`,
    algorithms: 'Algoritmos',
    algorithmsDescription: 'Explora algoritmos de speedcubing para 2x2, 3x3, cubos grandes, Pyraminx, Megaminx, Square-1 y mas.',
    algorithmsTitle: 'Algoritmos de Cubo Rubik',
    channels: 'Canales',
    channelsDescription: 'Descubre canales de YouTube de cubing con tutoriales, speedcubing, reseñas y aprendizaje de puzzles.',
    channelsTitle: 'Canales de Cubing en YouTube',
    home: 'Speedcube',
    notationDescription: (puzzle) => `Aprende notacion ${puzzle} con simbolos de movimientos, ejemplos y referencias practicas de speedcubing.`,
    notationTitle: (puzzle) => `Guia de Notacion ${puzzle}`,
    notations: 'Notaciones',
    notFoundDescription: 'Esta pagina de Speedcube no se encontro.',
    notFoundTitle: 'Pagina no encontrada',
    puzzleAlgorithmsTitle: (puzzle) => `Algoritmos ${puzzle}`,
    solver: 'Solver',
    solverDescription: 'Resuelve scrambles de cubo Rubik online con solver en Rust, reproduccion de movimientos y visualizacion del cubo.',
    solverTitle: 'Solver de Cubo Rubik Online',
    timer: 'Cronometro',
    timerDescription: 'Practica speedcubing con cronometro, scrambles generados, inspeccion, medias de sesion e historial de solves.',
    timerTitle: 'Cronometro de Speedcubing',
  },
  fr: {
    algorithmPuzzleDescription: (puzzle) => `Parcourez les algorithmes ${puzzle} pour l'entrainement speedcubing, la reconnaissance et l'execution.`,
    algorithmSetDescription: (set) => `Algorithmes ${set} pour l'entrainement speedcubing, la reconnaissance et les flux de resolution.`,
    algorithmSetTitle: (set) => `Algorithmes ${set}`,
    algorithms: 'Algorithmes',
    algorithmsDescription: 'Parcourez des algorithmes de speedcubing pour 2x2, 3x3, grands cubes, Pyraminx, Megaminx, Square-1 et plus.',
    algorithmsTitle: 'Algorithmes de Rubik Cube',
    channels: 'Chaines',
    channelsDescription: 'Decouvrez des chaines YouTube de cubing pour tutoriels, speedcubing, avis et apprentissage des puzzles.',
    channelsTitle: 'Chaines YouTube Cubing',
    home: 'Speedcube',
    notationDescription: (puzzle) => `Apprenez la notation ${puzzle} avec symboles, exemples et references pratiques de speedcubing.`,
    notationTitle: (puzzle) => `Guide de Notation ${puzzle}`,
    notations: 'Notations',
    notFoundDescription: 'Cette page Speedcube est introuvable.',
    notFoundTitle: 'Page introuvable',
    puzzleAlgorithmsTitle: (puzzle) => `Algorithmes ${puzzle}`,
    solver: 'Solver',
    solverDescription: 'Resoudre des scrambles de Rubik Cube en ligne avec un solver Rust, lecture des mouvements et visualisation du cube.',
    solverTitle: 'Solver Rubik Cube en Ligne',
    timer: 'Timer',
    timerDescription: 'Entrainez-vous au speedcubing avec timer, scrambles, inspection, moyennes de session et historique.',
    timerTitle: 'Timer de Speedcubing',
  },
  it: {
    algorithmPuzzleDescription: (puzzle) => `Sfoglia algoritmi ${puzzle} per pratica speedcubing, riconoscimento ed esecuzione.`,
    algorithmSetDescription: (set) => `Algoritmi ${set} per pratica speedcubing, riconoscimento e flussi di soluzione.`,
    algorithmSetTitle: (set) => `Algoritmi ${set}`,
    algorithms: 'Algoritmi',
    algorithmsDescription: 'Sfoglia set di algoritmi speedcubing per 2x2, 3x3, big cube, Pyraminx, Megaminx, Square-1 e altro.',
    algorithmsTitle: 'Algoritmi Cubo di Rubik',
    channels: 'Canali',
    channelsDescription: 'Scopri canali YouTube di cubing per tutorial, speedcubing, recensioni e apprendimento puzzle.',
    channelsTitle: 'Canali YouTube Cubing',
    home: 'Speedcube',
    notationDescription: (puzzle) => `Impara la notazione ${puzzle} con simboli, esempi e riferimenti pratici di speedcubing.`,
    notationTitle: (puzzle) => `Guida Notazione ${puzzle}`,
    notations: 'Notazioni',
    notFoundDescription: 'Questa pagina Speedcube non e stata trovata.',
    notFoundTitle: 'Pagina non trovata',
    puzzleAlgorithmsTitle: (puzzle) => `Algoritmi ${puzzle}`,
    solver: 'Solver',
    solverDescription: 'Risolvi scramble del Cubo di Rubik online con solver Rust, playback mosse e visualizzazione del cubo.',
    solverTitle: 'Solver Cubo di Rubik Online',
    timer: 'Timer',
    timerDescription: 'Pratica speedcubing con timer, scramble generati, ispezione, medie sessione e storico solve.',
    timerTitle: 'Timer Speedcubing',
  },
  ja: {
    algorithmPuzzleDescription: (puzzle) => `${puzzle} のスピードキューブ練習、認識、手順実行向けアルゴリズムを閲覧できます。`,
    algorithmSetDescription: (set) => `${set} のスピードキューブ練習、認識、解法フロー向けアルゴリズム。`,
    algorithmSetTitle: (set) => `${set} アルゴリズム`,
    algorithms: 'アルゴリズム',
    algorithmsDescription: '2x2、3x3、多分割キューブ、Pyraminx、Megaminx、Square-1 などのスピードキューブ用アルゴリズムを閲覧できます。',
    algorithmsTitle: 'ルービックキューブ アルゴリズム',
    channels: 'チャンネル',
    channelsDescription: 'チュートリアル、スピードキューブ、レビュー、学習に役立つキューブ系 YouTube チャンネルを見つけましょう。',
    channelsTitle: 'キューブ系 YouTube チャンネル',
    home: 'Speedcube',
    notationDescription: (puzzle) => `${puzzle} の記法を、記号、例、実用的なスピードキューブ参照で学べます。`,
    notationTitle: (puzzle) => `${puzzle} 記法ガイド`,
    notations: '記法',
    notFoundDescription: 'この Speedcube ページは見つかりませんでした。',
    notFoundTitle: 'ページが見つかりません',
    puzzleAlgorithmsTitle: (puzzle) => `${puzzle} アルゴリズム`,
    solver: 'ソルバー',
    solverDescription: 'Rust 製ソルバー、手順再生、キューブ表示で対応パズルのスクランブルをオンラインで解けます。',
    solverTitle: 'オンライン ルービックキューブ ソルバー',
    timer: 'タイマー',
    timerDescription: 'スクランブル、インスペクション、セッション平均、履歴つきのスピードキューブ用タイマーです。',
    timerTitle: 'スピードキューブ タイマー',
  },
  'pt-BR': {
    algorithmPuzzleDescription: (puzzle) => `Explore algoritmos de ${puzzle} para treino de speedcubing, reconhecimento e execucao de movimentos.`,
    algorithmSetDescription: (set) => `Algoritmos ${set} para treino de speedcubing, reconhecimento e fluxos de solucao.`,
    algorithmSetTitle: (set) => `Algoritmos ${set}`,
    algorithms: 'Algoritmos',
    algorithmsDescription: 'Explore algoritmos de speedcubing para 2x2, 3x3, cubos grandes, Pyraminx, Megaminx, Square-1 e mais.',
    algorithmsTitle: 'Algoritmos de Cubo Magico',
    channels: 'Canais',
    channelsDescription: 'Conheca canais de cubo magico no YouTube com tutoriais, speedcubing, reviews e aprendizado de puzzles.',
    channelsTitle: 'Canais de Cubo Magico no YouTube',
    home: 'Speedcube',
    notationDescription: (puzzle) => `Aprenda notacao ${puzzle} com simbolos de movimentos, exemplos e referencias praticas de speedcubing.`,
    notationTitle: (puzzle) => `Guia de Notacao ${puzzle}`,
    notations: 'Notacoes',
    notFoundDescription: 'Esta pagina do Speedcube nao foi encontrada.',
    notFoundTitle: 'Pagina nao encontrada',
    puzzleAlgorithmsTitle: (puzzle) => `Algoritmos ${puzzle}`,
    solver: 'Solver',
    solverDescription: 'Resolva scrambles de cubo magico online com solver em Rust, reproducao de movimentos e visualizacao do cubo.',
    solverTitle: 'Solver de Cubo Magico Online',
    timer: 'Cronometro',
    timerDescription: 'Treine speedcubing com cronometro, scrambles gerados, inspecao, medias de sessao e historico de solves.',
    timerTitle: 'Cronometro de Speedcubing',
  },
  ru: {
    algorithmPuzzleDescription: (puzzle) => `Алгоритмы ${puzzle} для тренировки спидкубинга, распознавания и выполнения ходов.`,
    algorithmSetDescription: (set) => `Алгоритмы ${set} для тренировки спидкубинга, распознавания и решения.`,
    algorithmSetTitle: (set) => `${set} алгоритмы`,
    algorithms: 'Алгоритмы',
    algorithmsDescription: 'Алгоритмы для 2x2, 3x3, больших кубов, Pyraminx, Megaminx, Square-1 и других головоломок.',
    algorithmsTitle: 'Алгоритмы кубика Рубика',
    channels: 'Каналы',
    channelsDescription: 'YouTube-каналы о кубинге: обучение, спидкубинг, обзоры и изучение головоломок.',
    channelsTitle: 'YouTube-каналы о кубинге',
    home: 'Speedcube',
    notationDescription: (puzzle) => `Изучайте нотацию ${puzzle}: символы ходов, примеры и практические материалы для спидкубинга.`,
    notationTitle: (puzzle) => `${puzzle}: руководство по нотации`,
    notations: 'Нотации',
    notFoundDescription: 'Эта страница Speedcube не найдена.',
    notFoundTitle: 'Страница не найдена',
    puzzleAlgorithmsTitle: (puzzle) => `${puzzle} алгоритмы`,
    solver: 'Решатель',
    solverDescription: 'Решайте поддерживаемые скрамблы онлайн с Rust-решателем, воспроизведением ходов и визуализацией куба.',
    solverTitle: 'Онлайн-решатель кубика Рубика',
    timer: 'Таймер',
    timerDescription: 'Тренируйте спидкубинг с таймером, скрамблами, инспекцией, средними и историей сборок.',
    timerTitle: 'Таймер для спидкубинга',
  },
  zh: {
    algorithmPuzzleDescription: (puzzle) => `浏览 ${puzzle} 速拧算法，用于练习、识别和执行手法。`,
    algorithmSetDescription: (set) => `${set} 算法，用于速拧练习、识别和还原流程。`,
    algorithmSetTitle: (set) => `${set} 算法`,
    algorithms: '算法',
    algorithmsDescription: '浏览 2x2、3x3、高阶魔方、Pyraminx、Megaminx、Square-1 等速拧算法。',
    algorithmsTitle: '魔方算法',
    channels: '频道',
    channelsDescription: '发现用于教程、速拧、评测和学习的魔方 YouTube 频道。',
    channelsTitle: '魔方 YouTube 频道',
    home: 'Speedcube',
    notationDescription: (puzzle) => `学习 ${puzzle} 记号，包括转动符号、示例和实用速拧参考。`,
    notationTitle: (puzzle) => `${puzzle} 记号指南`,
    notations: '记号',
    notFoundDescription: '未找到此 Speedcube 页面。',
    notFoundTitle: '页面未找到',
    puzzleAlgorithmsTitle: (puzzle) => `${puzzle} 算法`,
    solver: '求解器',
    solverDescription: '使用 Rust 驱动的求解器、步骤回放和魔方可视化在线求解支持的打乱。',
    solverTitle: '在线魔方求解器',
    timer: '计时器',
    timerDescription: '使用打乱、观察、分组平均和还原历史来练习速拧。',
    timerTitle: '速拧计时器',
  },
}

export function localePrefix(locale: SeoLocale): string {
  return localePrefixes[locale]
}

export function localeFromPathname(pathname: string): SeoLocale {
  const prefix = firstPathSegment(pathname)

  return seoLocales.find((locale) => localePrefixes[locale] === prefix) ?? defaultLocale
}

export function stripLocalePrefix(pathname: string): string {
  const normalizedPath = pathname || '/'
  const matchingLocale = prefixedSeoLocales.find((locale) => {
    const prefix = `/${localePrefixes[locale]}`
    return normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`)
  })

  if (matchingLocale === undefined) {
    return normalizedPath
  }

  const prefix = `/${localePrefixes[matchingLocale]}`
  return normalizedPath === prefix ? '/' : normalizedPath.slice(prefix.length)
}

export function localizedPath(path: string, locale: SeoLocale): string {
  const normalizedPath = normalizePath(path)
  const prefix = localePrefixes[locale]

  if (prefix === '') {
    return normalizedPath
  }

  return normalizedPath === '/' ? `/${prefix}` : `/${prefix}${normalizedPath}`
}

export function localizedUrl(path: string, locale: SeoLocale): string {
  return `${siteOrigin}${localizedPath(path, locale)}`
}

export function getSeoMetadata(pathname: string): SeoMetadata {
  const locale = localeFromPathname(pathname)
  const path = stripLocalePrefix(pathname)
  const route = metadataForPath(path, locale)
  const localeCopy = copy[locale]

  if (route === undefined) {
    return {
      breadcrumbs: [breadcrumb(locale, 'home', defaultSeoPath)],
      canonicalUrl: `${siteOrigin}${localizedPath(path, locale)}`,
      description: localeCopy.notFoundDescription,
      htmlLang: locale,
      locale,
      noindex: true,
      path,
      title: `${localeCopy.notFoundTitle} | ${siteName}`,
    }
  }

  return {
    ...route,
    canonicalUrl: localizedUrl(path, locale),
    htmlLang: locale,
    locale,
    noindex: false,
    path,
    title: `${route.title} | ${siteName}`,
  }
}

export function alternateUrl(path: string, locale: SeoLocale): string {
  return localizedUrl(path, locale)
}

function metadataForPath(path: string, locale: SeoLocale): Omit<SeoMetadata, 'canonicalUrl' | 'htmlLang' | 'locale' | 'noindex' | 'path'> | undefined {
  const localeCopy = copy[locale]

  if (path === '/' || path === '/solve') {
    return {
      breadcrumbs: [breadcrumb(locale, 'solver', '/solve')],
      description: localeCopy.solverDescription,
      jsonLdKind: 'web-application',
      title: localeCopy.solverTitle,
    }
  }

  if (path === '/timer') {
    return {
      breadcrumbs: [breadcrumb(locale, 'timer', '/timer')],
      description: localeCopy.timerDescription,
      title: localeCopy.timerTitle,
    }
  }

  if (path === '/channels') {
    return {
      breadcrumbs: [breadcrumb(locale, 'channels', '/channels')],
      description: localeCopy.channelsDescription,
      title: localeCopy.channelsTitle,
    }
  }

  if (path === '/algoritmos') {
    return {
      breadcrumbs: [breadcrumb(locale, 'algorithms', '/algoritmos')],
      description: localeCopy.algorithmsDescription,
      itemList: algorithmPuzzles.map((puzzle) => ({ name: puzzle.title, path: puzzle.path })),
      jsonLdKind: 'item-list',
      title: localeCopy.algorithmsTitle,
    }
  }

  const algorithmPuzzleMatch = path.match(/^\/algoritmos\/([^/]+)$/)
  if (algorithmPuzzleMatch !== null) {
    const puzzle = getAlgorithmPuzzle(algorithmPuzzleMatch[1])

    if (puzzle === undefined) {
      return undefined
    }

    const puzzleSets = setsForPuzzle(puzzle.id)

    return {
      breadcrumbs: [breadcrumb(locale, 'algorithms', '/algoritmos'), { name: puzzle.title, path: puzzle.path }],
      description: localeCopy.algorithmPuzzleDescription(puzzle.title),
      itemList: puzzleSets.map((set) => ({ name: set.title, path: set.path })),
      jsonLdKind: 'item-list',
      title: localeCopy.puzzleAlgorithmsTitle(puzzle.title),
    }
  }

  const algorithmSetMatch = path.match(/^\/algoritmos\/([^/]+)\/([^/]+)$/)
  if (algorithmSetMatch !== null) {
    const puzzle = getAlgorithmPuzzle(algorithmSetMatch[1])
    const set = algorithmSetSummaries.find((summary) => summary.puzzleId === algorithmSetMatch[1] && summary.routeSlug === algorithmSetMatch[2])

    if (puzzle === undefined || set === undefined) {
      return undefined
    }

    return {
      breadcrumbs: [
        breadcrumb(locale, 'algorithms', '/algoritmos'),
        { name: puzzle.title, path: puzzle.path },
        { name: set.title, path: set.path },
      ],
      description: localeCopy.algorithmSetDescription(set.title),
      title: localeCopy.algorithmSetTitle(set.title),
    }
  }

  const notationMatch = path.match(/^\/notations\/([^/]+)$/)
  if (notationMatch !== null) {
    const guide = getNotationGuide(notationMatch[1])

    if (guide === undefined) {
      return undefined
    }

    return {
      breadcrumbs: [breadcrumb(locale, 'notations', '/notations/3x3'), { name: guide.puzzle, path: guide.path }],
      description: localeCopy.notationDescription(guide.puzzle),
      jsonLdKind: 'tech-article',
      title: localeCopy.notationTitle(guide.puzzle),
    }
  }

  return undefined
}

function breadcrumb(locale: SeoLocale, key: 'algorithms' | 'channels' | 'home' | 'notations' | 'solver' | 'timer', path: string): SeoBreadcrumb {
  const labels = copy[locale]

  return { name: labels[key], path }
}

function firstPathSegment(pathname: string): string {
  return pathname.split('/').filter(Boolean)[0] ?? ''
}

function normalizePath(path: string): string {
  if (path === '') {
    return '/'
  }

  return path.startsWith('/') ? path : `/${path}`
}

export const seoIndexablePaths = [
  '/solve',
  '/timer',
  '/channels',
  '/algoritmos',
  ...algorithmPuzzles.map((puzzle) => puzzle.path),
  ...algorithmSetSummaries.map((set) => set.path),
  ...notationGuides.map((guide) => guide.path),
]
