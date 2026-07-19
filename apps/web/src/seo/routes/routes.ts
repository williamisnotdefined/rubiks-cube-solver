export const seoLocales = ['en-US', 'es', 'pt-BR', 'it', 'de', 'fr', 'ru', 'zh', 'ja'] as const
export type SeoLocale = (typeof seoLocales)[number]

type AlgorithmPuzzleId = '2x2' | '3x3' | '4x4' | '5x5' | '6x6' | 'megaminx' | 'pyraminx' | 'sq1'

type AlgorithmPuzzleSummary = {
  id: AlgorithmPuzzleId
  path: string
  title: string
}

type AlgorithmSetSummary = {
  path: string
  puzzleId: AlgorithmPuzzleId
  routeSlug: string
  title: string
}

type NotationGuideSummary = {
  id: string
  path: string
  puzzle: string
}

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

export type AppRouteKind =
  | 'algorithms-index'
  | 'algorithms-puzzle'
  | 'algorithms-set'
  | 'channels'
  | 'notation'
  | 'records'
  | 'sites'
  | 'solve'
  | 'stores'
  | 'timer'

export type AppRoute = {
  indexable: boolean
  kind: AppRouteKind
  path: string
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
  sites: string
  sitesDescription: string
  sitesTitle: string
  stores: string
  storesDescription: string
  storesTitle: string
  solver: string
  solverDescription: string
  solverTitle: string
  timer: string
  timerDescription: string
  timerTitle: string
  worldRecords: string
  worldRecordsDescription: string
  worldRecordsTitle: string
}

export const siteOrigin = 'https://speedcube.com.br'
export const siteName = 'Speedcube'
export const defaultLocale: SeoLocale = 'en-US'
export const defaultSeoPath = '/solve'
export const defaultOgImageUrl = `${siteOrigin}/og-default.svg`

export const appRouteManifest: readonly AppRoute[] = [
  { indexable: true, kind: 'solve', path: '/solve' },
  { indexable: true, kind: 'timer', path: '/timer' },
  { indexable: false, kind: 'records', path: '/records/world' },
  { indexable: true, kind: 'channels', path: '/channels' },
  { indexable: true, kind: 'sites', path: '/sites' },
  { indexable: true, kind: 'stores', path: '/stores' },
  { indexable: true, kind: 'algorithms-index', path: '/algorithms' },
  { indexable: true, kind: 'algorithms-puzzle', path: '/algorithms/:puzzleId' },
  { indexable: true, kind: 'algorithms-set', path: '/algorithms/:puzzleId/:methodId' },
  { indexable: true, kind: 'notation', path: '/notations/:puzzleId' },
] as const

const localePrefixes: Record<SeoLocale, string> = {
  de: 'de',
  'en-US': '',
  es: 'es',
  fr: 'fr',
  it: 'it',
  ja: 'ja',
  'pt-BR': 'pt-BR',
  ru: 'ru',
  zh: 'zh',
}

const legacyLocalePrefixes: Partial<Record<string, SeoLocale>> = {
  en: 'en-US',
}

export const prefixedSeoLocales = seoLocales.filter((locale) => locale !== defaultLocale)

const algorithmPuzzles: AlgorithmPuzzleSummary[] = [
  { id: '3x3', path: '/algorithms/3x3', title: '3x3' },
  { id: '2x2', path: '/algorithms/2x2', title: '2x2' },
  { id: '4x4', path: '/algorithms/4x4', title: '4x4' },
  { id: '5x5', path: '/algorithms/5x5', title: '5x5' },
  { id: '6x6', path: '/algorithms/6x6', title: '6x6' },
  { id: 'sq1', path: '/algorithms/sq1', title: 'Square-1' },
  { id: 'pyraminx', path: '/algorithms/pyraminx', title: 'Pyraminx' },
  { id: 'megaminx', path: '/algorithms/megaminx', title: 'Megaminx' },
]

const algorithmSetSummaries: AlgorithmSetSummary[] = [
  { path: '/algorithms/3x3/oll', puzzleId: '3x3', routeSlug: 'oll', title: '3x3 OLL' },
  { path: '/algorithms/3x3/pll', puzzleId: '3x3', routeSlug: 'pll', title: '3x3 PLL' },
  {
    path: '/algorithms/3x3/2look-oll',
    puzzleId: '3x3',
    routeSlug: '2look-oll',
    title: '3x3 2-Look OLL',
  },
  {
    path: '/algorithms/3x3/2look-pll',
    puzzleId: '3x3',
    routeSlug: '2look-pll',
    title: '3x3 2-Look PLL',
  },
  { path: '/algorithms/3x3/coll', puzzleId: '3x3', routeSlug: 'coll', title: '3x3 COLL' },
  {
    path: '/algorithms/3x3/winter-variation',
    puzzleId: '3x3',
    routeSlug: 'winter-variation',
    title: '3x3 Winter Variation',
  },
  { path: '/algorithms/3x3/oh-oll', puzzleId: '3x3', routeSlug: 'oh-oll', title: '3x3 OH OLL' },
  { path: '/algorithms/3x3/oh-pll', puzzleId: '3x3', routeSlug: 'oh-pll', title: '3x3 OH PLL' },
  { path: '/algorithms/2x2/oll', puzzleId: '2x2', routeSlug: 'oll', title: '2x2 OLL' },
  { path: '/algorithms/2x2/pbl', puzzleId: '2x2', routeSlug: 'pbl', title: '2x2 PBL' },
  { path: '/algorithms/2x2/cll', puzzleId: '2x2', routeSlug: 'cll', title: '2x2 CLL' },
  { path: '/algorithms/2x2/eg-1', puzzleId: '2x2', routeSlug: 'eg-1', title: '2x2 EG-1' },
  { path: '/algorithms/4x4/oll', puzzleId: '4x4', routeSlug: 'oll', title: '4x4 OLL' },
  { path: '/algorithms/4x4/pll', puzzleId: '4x4', routeSlug: 'pll', title: '4x4 PLL' },
  { path: '/algorithms/3x3/f2l', puzzleId: '3x3', routeSlug: 'f2l', title: '3x3 F2L' },
  {
    path: '/algorithms/3x3/advanced-f2l',
    puzzleId: '3x3',
    routeSlug: 'advanced-f2l',
    title: '3x3 Advanced F2L',
  },
  { path: '/algorithms/2x2/eg-2', puzzleId: '2x2', routeSlug: 'eg-2', title: '2x2 EG-2' },
  { path: '/algorithms/3x3/zbll-t', puzzleId: '3x3', routeSlug: 'zbll-t', title: '3x3 ZBLL T' },
  { path: '/algorithms/3x3/zbll-u', puzzleId: '3x3', routeSlug: 'zbll-u', title: '3x3 ZBLL U' },
  { path: '/algorithms/3x3/zbll-l', puzzleId: '3x3', routeSlug: 'zbll-l', title: '3x3 ZBLL L' },
  {
    path: '/algorithms/3x3/zbll-sune',
    puzzleId: '3x3',
    routeSlug: 'zbll-sune',
    title: '3x3 ZBLL Sune',
  },
  {
    path: '/algorithms/3x3/zbll-antisune',
    puzzleId: '3x3',
    routeSlug: 'zbll-antisune',
    title: '3x3 ZBLL Antisune',
  },
  { path: '/algorithms/3x3/zbll-pi', puzzleId: '3x3', routeSlug: 'zbll-pi', title: '3x3 ZBLL Pi' },
  { path: '/algorithms/3x3/zbll-h', puzzleId: '3x3', routeSlug: 'zbll-h', title: '3x3 ZBLL H' },
  { path: '/algorithms/3x3/vls-ub', puzzleId: '3x3', routeSlug: 'vls-ub', title: '3x3 VLS UB' },
  {
    path: '/algorithms/3x3/vls-ub-ul',
    puzzleId: '3x3',
    routeSlug: 'vls-ub-ul',
    title: '3x3 VLS UB UL',
  },
  { path: '/algorithms/3x3/vls-uf', puzzleId: '3x3', routeSlug: 'vls-uf', title: '3x3 VLS UF' },
  {
    path: '/algorithms/3x3/vls-uf-ub',
    puzzleId: '3x3',
    routeSlug: 'vls-uf-ub',
    title: '3x3 VLS UF UB',
  },
  {
    path: '/algorithms/3x3/vls-uf-ul',
    puzzleId: '3x3',
    routeSlug: 'vls-uf-ul',
    title: '3x3 VLS UF UL',
  },
  { path: '/algorithms/3x3/vls-ul', puzzleId: '3x3', routeSlug: 'vls-ul', title: '3x3 VLS UL' },
  {
    path: '/algorithms/3x3/vls-no-edges',
    puzzleId: '3x3',
    routeSlug: 'vls-no-edges',
    title: '3x3 VLS No Edges',
  },
  {
    path: '/algorithms/sq1/cubeshape',
    puzzleId: 'sq1',
    routeSlug: 'cubeshape',
    title: 'Square-1 Cubeshape',
  },
  { path: '/algorithms/sq1/cp', puzzleId: 'sq1', routeSlug: 'cp', title: 'Square-1 CP' },
  { path: '/algorithms/sq1/ep', puzzleId: 'sq1', routeSlug: 'ep', title: 'Square-1 EP' },
  {
    path: '/algorithms/sq1/parity',
    puzzleId: 'sq1',
    routeSlug: 'parity',
    title: 'Square-1 Parity',
  },
  {
    path: '/algorithms/pyraminx/l4e',
    puzzleId: 'pyraminx',
    routeSlug: 'l4e',
    title: 'Pyraminx L4E',
  },
  {
    path: '/algorithms/pyraminx/l3e',
    puzzleId: 'pyraminx',
    routeSlug: 'l3e',
    title: 'Pyraminx L3E',
  },
  {
    path: '/algorithms/megaminx/oll',
    puzzleId: 'megaminx',
    routeSlug: 'oll',
    title: 'Megaminx OLL',
  },
  {
    path: '/algorithms/megaminx/pll',
    puzzleId: 'megaminx',
    routeSlug: 'pll',
    title: 'Megaminx PLL',
  },
  { path: '/algorithms/megaminx/eo', puzzleId: 'megaminx', routeSlug: 'eo', title: 'Megaminx EO' },
  { path: '/algorithms/megaminx/co', puzzleId: 'megaminx', routeSlug: 'co', title: 'Megaminx CO' },
  { path: '/algorithms/megaminx/ep', puzzleId: 'megaminx', routeSlug: 'ep', title: 'Megaminx EP' },
  { path: '/algorithms/megaminx/cp', puzzleId: 'megaminx', routeSlug: 'cp', title: 'Megaminx CP' },
  {
    path: '/algorithms/4x4/oll-parity',
    puzzleId: '4x4',
    routeSlug: 'oll-parity',
    title: '4x4 OLL Parity',
  },
  {
    path: '/algorithms/4x4/pll-parity',
    puzzleId: '4x4',
    routeSlug: 'pll-parity',
    title: '4x4 PLL Parity',
  },
  { path: '/algorithms/5x5/l2e', puzzleId: '5x5', routeSlug: 'l2e', title: '5x5 L2E' },
  { path: '/algorithms/5x5/l2c', puzzleId: '5x5', routeSlug: 'l2c', title: '5x5 L2C' },
  { path: '/algorithms/6x6/l2e', puzzleId: '6x6', routeSlug: 'l2e', title: '6x6 L2E' },
  { path: '/algorithms/6x6/l2c', puzzleId: '6x6', routeSlug: 'l2c', title: '6x6 L2C' },
]

const notationGuides: NotationGuideSummary[] = [
  { id: '2x2', path: '/notations/2x2', puzzle: '2x2' },
  { id: '3x3', path: '/notations/3x3', puzzle: '3x3' },
  { id: '4x4', path: '/notations/4x4', puzzle: '4x4' },
  { id: '5x5', path: '/notations/5x5', puzzle: '5x5' },
  { id: '6x6', path: '/notations/6x6', puzzle: '6x6' },
  { id: '7x7', path: '/notations/7x7', puzzle: '7x7' },
  { id: 'pyraminx', path: '/notations/pyraminx', puzzle: 'Pyraminx' },
  { id: 'square-1', path: '/notations/square-1', puzzle: 'Square-1' },
  { id: 'megaminx', path: '/notations/megaminx', puzzle: 'Megaminx' },
  { id: 'skewb', path: '/notations/skewb', puzzle: 'Skewb' },
  { id: 'clock', path: '/notations/clock', puzzle: 'Clock' },
]

const cubingSiteItems: SeoItem[] = [
  { name: 'World Cube Association', path: 'https://www.worldcubeassociation.org/' },
  { name: 'csTimer', path: 'https://cstimer.net/' },
  { name: 'J Perm', path: 'https://jperm.net/' },
  { name: 'Speedsolving Forum', path: 'https://www.speedsolving.com/' },
  { name: 'Ruwix', path: 'https://ruwix.com/' },
  { name: 'alg.cubing.net', path: 'https://alg.cubing.net/' },
  { name: 'CubeSkills', path: 'https://www.cubeskills.com/' },
  { name: 'CubeDesk', path: 'https://www.cubedesk.io/home' },
  { name: 'Cubo Velocidade', path: 'https://cubovelocidade.com.br/' },
  { name: 'SpeedCubeDB', path: 'https://speedcubedb.com/' },
  { name: 'CubingApp', path: 'https://cubingapp.com/' },
  { name: 'Cubing.net', path: 'https://www.cubing.net/' },
  { name: 'TNOODLE', path: 'https://tnoodle.cubing.net/' },
  { name: 'WCA Live', path: 'https://live.worldcubeassociation.org/' },
  { name: 'CubingUSA', path: 'https://www.cubingusa.org/' },
  { name: 'Reddit r/Cubers', path: 'https://www.reddit.com/r/Cubers/' },
  { name: "Rubik's Official", path: 'https://www.rubiks.com/' },
  { name: 'GAN Cube', path: 'https://www.gancube.com/' },
  { name: 'MoYu', path: 'https://www.moyustore.com/' },
  { name: 'QiYi', path: 'https://www.qiyitoys.net/' },
  { name: 'YJ Cube', path: 'https://www.yjcube.com/' },
  { name: 'SpeedCubeReview', path: 'https://www.speedcubereview.com/' },
  { name: "Sarah's Cubing Site", path: 'https://sarah.cubing.net/' },
  { name: "Jaap's Puzzle Page", path: 'https://www.jaapsch.net/puzzles/' },
  { name: 'Ryan Heise', path: 'https://www.ryanheise.com/cube/' },
  { name: 'Lars Petrus Method', path: 'https://lar5.com/cube/' },
  { name: 'Speedsolving Wiki', path: 'https://www.speedsolving.com/wiki/index.php/Main_Page' },
  { name: 'Badmephisto', path: 'http://badmephisto.com/' },
  { name: 'Ruwix Solvers', path: 'https://ruwix.com/cube-solver/' },
  { name: 'Grubiks', path: 'https://www.grubiks.com/solvers/rubiks-cube-3x3x3/' },
  { name: 'CubeSolve', path: 'https://cubesolve.com/' },
  { name: 'AlgDb', path: 'https://algdb.net/' },
  { name: 'Cubefreak', path: 'http://www.cubefreak.net/' },
]

const cubingStoreItems: SeoItem[] = [
  { name: 'Cuber Brasil', path: 'https://www.cuberbrasil.com/' },
  { name: 'DailyPuzzles', path: 'https://dailypuzzles.com.au/' },
  { name: 'Cubezz', path: 'https://www.cubezz.com/' },
  { name: 'ZiiCube', path: 'https://www.ziicube.com/' },
  { name: 'Kubekings', path: 'https://kubekings.com/' },
  { name: 'KewbzUK', path: 'https://kewbz.co.uk/' },
  { name: 'Cubelelo', path: 'https://www.cubelelo.com/' },
  { name: 'tribox', path: 'https://store.tribox.com/' },
  { name: 'SpeedCubeShop', path: 'https://speedcubeshop.com/' },
  { name: 'The Cubicle', path: 'https://www.thecubicle.com/' },
]

const copy: Record<SeoLocale, SeoCopy> = {
  de: {
    algorithmPuzzleDescription: (puzzle) =>
      `Durchsuche ${puzzle}-Algorithmen fuer Speedcubing-Training, Erkennung und Ausfuehrung.`,
    algorithmSetDescription: (set) =>
      `${set}-Algorithmen fuer Speedcubing-Training, Erkennung und Loesungsablaeufe.`,
    algorithmSetTitle: (set) => `${set} Algorithmen`,
    algorithms: 'Algorithmen',
    algorithmsDescription:
      'Durchsuche Speedcubing-Algorithmen fuer 2x2, 3x3, Big Cubes, Pyraminx, Megaminx, Square-1 und mehr.',
    algorithmsTitle: 'Rubik Cube Algorithmen',
    channels: 'Kanaele',
    channelsDescription:
      'Entdecke Cubing-YouTube-Kanaele fuer Tutorials, Speedcubing, Reviews und Puzzle-Lernen.',
    channelsTitle: 'Cubing YouTube Kanaele',
    home: 'Speedcube',
    notationDescription: (puzzle) =>
      `Lerne ${puzzle}-Notation mit Symbolen, Beispielen und praktischen Speedcubing-Referenzen.`,
    notationTitle: (puzzle) => `${puzzle} Notationsguide`,
    notations: 'Notationen',
    notFoundDescription: 'Diese Speedcube-Seite wurde nicht gefunden.',
    notFoundTitle: 'Seite nicht gefunden',
    puzzleAlgorithmsTitle: (puzzle) => `${puzzle} Algorithmen`,
    sites: 'Sites',
    sitesDescription:
      'Entdecke validierte Cubing-Websites fuer Loesungen, Tools, Wettbewerbe, Marken und Community.',
    sitesTitle: 'Cubing Websites',
    stores: 'Shops',
    storesDescription:
      'Entdecke unabhaengige Online-Shops fuer Speedcubes, Puzzles und Cubing-Zubehoer.',
    storesTitle: 'Speedcube Shops',
    solver: 'Solver',
    solverDescription:
      'Loese unterstuetzte Rubik-Cube-Scrambles online mit Rust-Solver, Zugwiedergabe und Cube-Visualisierung.',
    solverTitle: 'Online Rubik Cube Solver',
    timer: 'Timer',
    timerDescription:
      'Trainiere Speedcubing mit Timer, Scrambles, Inspektion, Session-Durchschnitten und Solve-Historie.',
    timerTitle: 'Speedcubing Timer',
    worldRecords: 'World Records',
    worldRecordsDescription:
      'Explore current WCA world records with athlete, result, competition and scramble candidate data.',
    worldRecordsTitle: 'WCA World Records',
  },
  'en-US': {
    algorithmPuzzleDescription: (puzzle) =>
      `Browse ${puzzle} algorithm sets for speedcubing practice, recognition, and move execution.`,
    algorithmSetDescription: (set) =>
      `${set} algorithms for speedcubing practice, recognition, and solving workflows.`,
    algorithmSetTitle: (set) => `${set} Algorithms`,
    algorithms: 'Algorithms',
    algorithmsDescription:
      'Browse speedcubing algorithm sets for 2x2, 3x3, big cubes, Pyraminx, Megaminx, Square-1, and more.',
    algorithmsTitle: "Rubik's Cube Algorithms",
    channels: 'Channels',
    channelsDescription:
      'Discover cubing YouTube channels for tutorials, speedcubing walkthroughs, reviews, and puzzle learning.',
    channelsTitle: 'Cubing YouTube Channels',
    home: 'Speedcube',
    notationDescription: (puzzle) =>
      `Learn ${puzzle} notation with move symbols, examples, and practical speedcubing references.`,
    notationTitle: (puzzle) => `${puzzle} Notation Guide`,
    notations: 'Notations',
    notFoundDescription: 'This Speedcube page could not be found.',
    notFoundTitle: 'Page not found',
    puzzleAlgorithmsTitle: (puzzle) => `${puzzle} Algorithms`,
    sites: 'Sites',
    sitesDescription:
      'Discover validated cubing websites for solutions, tools, competitions, brands, and community.',
    sitesTitle: 'Cubing Websites',
    stores: 'Stores',
    storesDescription:
      'Discover independent online stores for speed cubes, puzzles, and cubing accessories.',
    storesTitle: 'Speed Cube Stores',
    solver: 'Solver',
    solverDescription:
      "Solve supported Rubik's Cube scrambles online with a Rust-powered solver, move playback, and cube visualization.",
    solverTitle: "Online Rubik's Cube Solver",
    timer: 'Timer',
    timerDescription:
      'Practice speedcubing with a focused timer, generated scrambles, inspection, session averages, and solve history.',
    timerTitle: 'Speedcubing Timer',
    worldRecords: 'World Records',
    worldRecordsDescription:
      'Explore current WCA world records with athlete, result, competition and scramble candidate data.',
    worldRecordsTitle: 'WCA World Records',
  },
  es: {
    algorithmPuzzleDescription: (puzzle) =>
      `Explora algoritmos de ${puzzle} para practica de speedcubing, reconocimiento y ejecucion de movimientos.`,
    algorithmSetDescription: (set) =>
      `Algoritmos ${set} para practica de speedcubing, reconocimiento y flujos de solucion.`,
    algorithmSetTitle: (set) => `Algoritmos ${set}`,
    algorithms: 'Algoritmos',
    algorithmsDescription:
      'Explora algoritmos de speedcubing para 2x2, 3x3, cubos grandes, Pyraminx, Megaminx, Square-1 y mas.',
    algorithmsTitle: 'Algoritmos de Cubo Rubik',
    channels: 'Canales',
    channelsDescription:
      'Descubre canales de YouTube de cubing con tutoriales, speedcubing, reseñas y aprendizaje de puzzles.',
    channelsTitle: 'Canales de Cubing en YouTube',
    home: 'Speedcube',
    notationDescription: (puzzle) =>
      `Aprende notacion ${puzzle} con simbolos de movimientos, ejemplos y referencias practicas de speedcubing.`,
    notationTitle: (puzzle) => `Guia de Notacion ${puzzle}`,
    notations: 'Notaciones',
    notFoundDescription: 'Esta pagina de Speedcube no se encontro.',
    notFoundTitle: 'Pagina no encontrada',
    puzzleAlgorithmsTitle: (puzzle) => `Algoritmos ${puzzle}`,
    sites: 'Sitios',
    sitesDescription:
      'Descubre sitios de cubing validados para soluciones, herramientas, competiciones, marcas y comunidad.',
    sitesTitle: 'Sitios de Cubing',
    stores: 'Tiendas',
    storesDescription:
      'Descubre tiendas online independientes de speedcubes, rompecabezas y accesorios de cubing.',
    storesTitle: 'Tiendas de Speedcubing',
    solver: 'Solver',
    solverDescription:
      'Resuelve scrambles de cubo Rubik online con solver en Rust, reproduccion de movimientos y visualizacion del cubo.',
    solverTitle: 'Solver de Cubo Rubik Online',
    timer: 'Cronometro',
    timerDescription:
      'Practica speedcubing con cronometro, scrambles generados, inspeccion, medias de sesion e historial de solves.',
    timerTitle: 'Cronometro de Speedcubing',
    worldRecords: 'World Records',
    worldRecordsDescription:
      'Explore current WCA world records with athlete, result, competition and scramble candidate data.',
    worldRecordsTitle: 'WCA World Records',
  },
  fr: {
    algorithmPuzzleDescription: (puzzle) =>
      `Parcourez les algorithmes ${puzzle} pour l'entrainement speedcubing, la reconnaissance et l'execution.`,
    algorithmSetDescription: (set) =>
      `Algorithmes ${set} pour l'entrainement speedcubing, la reconnaissance et les flux de resolution.`,
    algorithmSetTitle: (set) => `Algorithmes ${set}`,
    algorithms: 'Algorithmes',
    algorithmsDescription:
      'Parcourez des algorithmes de speedcubing pour 2x2, 3x3, grands cubes, Pyraminx, Megaminx, Square-1 et plus.',
    algorithmsTitle: 'Algorithmes de Rubik Cube',
    channels: 'Chaines',
    channelsDescription:
      'Decouvrez des chaines YouTube de cubing pour tutoriels, speedcubing, avis et apprentissage des puzzles.',
    channelsTitle: 'Chaines YouTube Cubing',
    home: 'Speedcube',
    notationDescription: (puzzle) =>
      `Apprenez la notation ${puzzle} avec symboles, exemples et references pratiques de speedcubing.`,
    notationTitle: (puzzle) => `Guide de Notation ${puzzle}`,
    notations: 'Notations',
    notFoundDescription: 'Cette page Speedcube est introuvable.',
    notFoundTitle: 'Page introuvable',
    puzzleAlgorithmsTitle: (puzzle) => `Algorithmes ${puzzle}`,
    sites: 'Sites',
    sitesDescription:
      'Decouvrez des sites de cubing valides pour solutions, outils, competitions, marques et communaute.',
    sitesTitle: 'Sites de Cubing',
    stores: 'Boutiques',
    storesDescription:
      'Decouvrez des boutiques en ligne independantes de speedcubes, puzzles et accessoires de cubing.',
    storesTitle: 'Boutiques de Speedcubing',
    solver: 'Solver',
    solverDescription:
      'Resoudre des scrambles de Rubik Cube en ligne avec un solver Rust, lecture des mouvements et visualisation du cube.',
    solverTitle: 'Solver Rubik Cube en Ligne',
    timer: 'Timer',
    timerDescription:
      'Entrainez-vous au speedcubing avec timer, scrambles, inspection, moyennes de session et historique.',
    timerTitle: 'Timer de Speedcubing',
    worldRecords: 'World Records',
    worldRecordsDescription:
      'Explore current WCA world records with athlete, result, competition and scramble candidate data.',
    worldRecordsTitle: 'WCA World Records',
  },
  it: {
    algorithmPuzzleDescription: (puzzle) =>
      `Sfoglia algoritmi ${puzzle} per pratica speedcubing, riconoscimento ed esecuzione.`,
    algorithmSetDescription: (set) =>
      `Algoritmi ${set} per pratica speedcubing, riconoscimento e flussi di soluzione.`,
    algorithmSetTitle: (set) => `Algoritmi ${set}`,
    algorithms: 'Algoritmi',
    algorithmsDescription:
      'Sfoglia set di algoritmi speedcubing per 2x2, 3x3, big cube, Pyraminx, Megaminx, Square-1 e altro.',
    algorithmsTitle: 'Algoritmi Cubo di Rubik',
    channels: 'Canali',
    channelsDescription:
      'Scopri canali YouTube di cubing per tutorial, speedcubing, recensioni e apprendimento puzzle.',
    channelsTitle: 'Canali YouTube Cubing',
    home: 'Speedcube',
    notationDescription: (puzzle) =>
      `Impara la notazione ${puzzle} con simboli, esempi e riferimenti pratici di speedcubing.`,
    notationTitle: (puzzle) => `Guida Notazione ${puzzle}`,
    notations: 'Notazioni',
    notFoundDescription: 'Questa pagina Speedcube non e stata trovata.',
    notFoundTitle: 'Pagina non trovata',
    puzzleAlgorithmsTitle: (puzzle) => `Algoritmi ${puzzle}`,
    sites: 'Siti',
    sitesDescription:
      'Scopri siti cubing verificati per soluzioni, strumenti, competizioni, marchi e community.',
    sitesTitle: 'Siti Cubing',
    stores: 'Negozi',
    storesDescription:
      'Scopri negozi online indipendenti di speedcube, puzzle e accessori per cubing.',
    storesTitle: 'Negozi di Speedcubing',
    solver: 'Solver',
    solverDescription:
      'Risolvi scramble del Cubo di Rubik online con solver Rust, playback mosse e visualizzazione del cubo.',
    solverTitle: 'Solver Cubo di Rubik Online',
    timer: 'Timer',
    timerDescription:
      'Pratica speedcubing con timer, scramble generati, ispezione, medie sessione e storico solve.',
    timerTitle: 'Timer Speedcubing',
    worldRecords: 'World Records',
    worldRecordsDescription:
      'Explore current WCA world records with athlete, result, competition and scramble candidate data.',
    worldRecordsTitle: 'WCA World Records',
  },
  ja: {
    algorithmPuzzleDescription: (puzzle) =>
      `${puzzle} のスピードキューブ練習、認識、手順実行向けアルゴリズムを閲覧できます。`,
    algorithmSetDescription: (set) =>
      `${set} のスピードキューブ練習、認識、解法フロー向けアルゴリズム。`,
    algorithmSetTitle: (set) => `${set} アルゴリズム`,
    algorithms: 'アルゴリズム',
    algorithmsDescription:
      '2x2、3x3、多分割キューブ、Pyraminx、Megaminx、Square-1 などのスピードキューブ用アルゴリズムを閲覧できます。',
    algorithmsTitle: 'ルービックキューブ アルゴリズム',
    channels: 'チャンネル',
    channelsDescription:
      'チュートリアル、スピードキューブ、レビュー、学習に役立つキューブ系 YouTube チャンネルを見つけましょう。',
    channelsTitle: 'キューブ系 YouTube チャンネル',
    home: 'Speedcube',
    notationDescription: (puzzle) =>
      `${puzzle} の記法を、記号、例、実用的なスピードキューブ参照で学べます。`,
    notationTitle: (puzzle) => `${puzzle} 記法ガイド`,
    notations: '記法',
    notFoundDescription: 'この Speedcube ページは見つかりませんでした。',
    notFoundTitle: 'ページが見つかりません',
    puzzleAlgorithmsTitle: (puzzle) => `${puzzle} アルゴリズム`,
    sites: 'サイト',
    sitesDescription:
      '解法、ツール、大会、ブランド、コミュニティ向けの検証済みキューブ系サイトを探せます。',
    sitesTitle: 'キューブ系サイト',
    stores: 'ショップ',
    storesDescription:
      'スピードキューブ、パズル、キューブアクセサリーを扱う独立系オンラインショップを探せます。',
    storesTitle: 'スピードキューブショップ',
    solver: 'ソルバー',
    solverDescription:
      'Rust 製ソルバー、手順再生、キューブ表示で対応パズルのスクランブルをオンラインで解けます。',
    solverTitle: 'オンライン ルービックキューブ ソルバー',
    timer: 'タイマー',
    timerDescription:
      'スクランブル、インスペクション、セッション平均、履歴つきのスピードキューブ用タイマーです。',
    timerTitle: 'スピードキューブ タイマー',
    worldRecords: 'World Records',
    worldRecordsDescription:
      'Explore current WCA world records with athlete, result, competition and scramble candidate data.',
    worldRecordsTitle: 'WCA World Records',
  },
  'pt-BR': {
    algorithmPuzzleDescription: (puzzle) =>
      `Explore algoritmos de ${puzzle} para treino de speedcubing, reconhecimento e execucao de movimentos.`,
    algorithmSetDescription: (set) =>
      `Algoritmos ${set} para treino de speedcubing, reconhecimento e fluxos de solucao.`,
    algorithmSetTitle: (set) => `Algoritmos ${set}`,
    algorithms: 'Algoritmos',
    algorithmsDescription:
      'Explore algoritmos de speedcubing para 2x2, 3x3, cubos grandes, Pyraminx, Megaminx, Square-1 e mais.',
    algorithmsTitle: 'Algoritmos de Cubo Magico',
    channels: 'Canais',
    channelsDescription:
      'Conheca canais de cubo magico no YouTube com tutoriais, speedcubing, reviews e aprendizado de puzzles.',
    channelsTitle: 'Canais de Cubo Magico no YouTube',
    home: 'Speedcube',
    notationDescription: (puzzle) =>
      `Aprenda notacao ${puzzle} com simbolos de movimentos, exemplos e referencias praticas de speedcubing.`,
    notationTitle: (puzzle) => `Guia de Notacao ${puzzle}`,
    notations: 'Notacoes',
    notFoundDescription: 'Esta pagina do Speedcube nao foi encontrada.',
    notFoundTitle: 'Pagina nao encontrada',
    puzzleAlgorithmsTitle: (puzzle) => `Algoritmos ${puzzle}`,
    sites: 'Sites',
    sitesDescription:
      'Conheca sites validados de cubo magico para solucoes, ferramentas, competicoes, marcas e comunidade.',
    sitesTitle: 'Sites de Cubo Magico',
    stores: 'Lojas',
    storesDescription:
      'Conheca lojas online independentes de speedcubes, puzzles e acessorios para cubo magico.',
    storesTitle: 'Lojas de Cubo Magico',
    solver: 'Solver',
    solverDescription:
      'Resolva scrambles de cubo magico online com solver em Rust, reproducao de movimentos e visualizacao do cubo.',
    solverTitle: 'Solver de Cubo Magico Online',
    timer: 'Cronometro',
    timerDescription:
      'Treine speedcubing com cronometro, scrambles gerados, inspecao, medias de sessao e historico de solves.',
    timerTitle: 'Cronometro de Speedcubing',
    worldRecords: 'World Records',
    worldRecordsDescription:
      'Explore current WCA world records with athlete, result, competition and scramble candidate data.',
    worldRecordsTitle: 'WCA World Records',
  },
  ru: {
    algorithmPuzzleDescription: (puzzle) =>
      `Алгоритмы ${puzzle} для тренировки спидкубинга, распознавания и выполнения ходов.`,
    algorithmSetDescription: (set) =>
      `Алгоритмы ${set} для тренировки спидкубинга, распознавания и решения.`,
    algorithmSetTitle: (set) => `${set} алгоритмы`,
    algorithms: 'Алгоритмы',
    algorithmsDescription:
      'Алгоритмы для 2x2, 3x3, больших кубов, Pyraminx, Megaminx, Square-1 и других головоломок.',
    algorithmsTitle: 'Алгоритмы кубика Рубика',
    channels: 'Каналы',
    channelsDescription:
      'YouTube-каналы о кубинге: обучение, спидкубинг, обзоры и изучение головоломок.',
    channelsTitle: 'YouTube-каналы о кубинге',
    home: 'Speedcube',
    notationDescription: (puzzle) =>
      `Изучайте нотацию ${puzzle}: символы ходов, примеры и практические материалы для спидкубинга.`,
    notationTitle: (puzzle) => `${puzzle}: руководство по нотации`,
    notations: 'Нотации',
    notFoundDescription: 'Эта страница Speedcube не найдена.',
    notFoundTitle: 'Страница не найдена',
    puzzleAlgorithmsTitle: (puzzle) => `${puzzle} алгоритмы`,
    sites: 'Сайты',
    sitesDescription:
      'Проверенные сайты о кубинге: решения, инструменты, соревнования, бренды и сообщества.',
    sitesTitle: 'Сайты о кубинге',
    stores: 'Магазины',
    storesDescription:
      'Независимые онлайн-магазины скоростных кубов, головоломок и куберских аксессуаров.',
    storesTitle: 'Магазины для спидкубинга',
    solver: 'Решатель',
    solverDescription:
      'Решайте поддерживаемые скрамблы онлайн с Rust-решателем, воспроизведением ходов и визуализацией куба.',
    solverTitle: 'Онлайн-решатель кубика Рубика',
    timer: 'Таймер',
    timerDescription:
      'Тренируйте спидкубинг с таймером, скрамблами, инспекцией, средними и историей сборок.',
    timerTitle: 'Таймер для спидкубинга',
    worldRecords: 'World Records',
    worldRecordsDescription:
      'Explore current WCA world records with athlete, result, competition and scramble candidate data.',
    worldRecordsTitle: 'WCA World Records',
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
    sites: '网站',
    sitesDescription: '发现经过验证的魔方网站，涵盖解法、工具、比赛、品牌和社区。',
    sitesTitle: '魔方网站',
    stores: '商店',
    storesDescription: '发现提供速拧魔方、益智玩具和魔方配件的独立在线商店。',
    storesTitle: '速拧魔方商店',
    solver: '求解器',
    solverDescription: '使用 Rust 驱动的求解器、步骤回放和魔方可视化在线求解支持的打乱。',
    solverTitle: '在线魔方求解器',
    timer: '计时器',
    timerDescription: '使用打乱、观察、分组平均和还原历史来练习速拧。',
    timerTitle: '速拧计时器',
    worldRecords: 'World Records',
    worldRecordsDescription:
      'Explore current WCA world records with athlete, result, competition and scramble candidate data.',
    worldRecordsTitle: 'WCA World Records',
  },
}

export function localePrefix(locale: SeoLocale): string {
  return localePrefixes[locale]
}

export function localeFromPathname(pathname: string): SeoLocale {
  const prefix = firstPathSegment(pathname)

  return (
    seoLocales.find((locale) => localePrefixes[locale] === prefix) ??
    legacyLocalePrefixes[prefix] ??
    defaultLocale
  )
}

export function stripLocalePrefix(pathname: string): string {
  const normalizedPath = normalizePath(pathname)
  const routePrefixes = [
    ...prefixedSeoLocales.map((locale) => localePrefixes[locale]),
    ...Object.keys(legacyLocalePrefixes),
  ]
  const matchingPrefix = routePrefixes.find((routePrefix) => {
    const prefix = `/${routePrefix}`
    return normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`)
  })

  if (matchingPrefix === undefined) {
    return normalizedPath
  }

  const prefix = `/${matchingPrefix}`
  return normalizedPath === prefix ? '/' : normalizePath(normalizedPath.slice(prefix.length))
}

export function localizedPath(path: string, locale: SeoLocale): string {
  const normalizedPath = withTrailingSlash(normalizePath(path))
  const prefix = localePrefixes[locale]

  if (prefix === '') {
    return normalizedPath
  }

  return normalizedPath === '/' ? `/${prefix}/` : `/${prefix}${normalizedPath}`
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
    noindex: !seoIndexablePaths.includes(path),
    path,
    title: `${route.title} | ${siteName}`,
  }
}

export function alternateUrl(path: string, locale: SeoLocale): string {
  return localizedUrl(path, locale)
}

function getAlgorithmPuzzle(puzzleId: string | undefined): AlgorithmPuzzleSummary | undefined {
  return algorithmPuzzles.find((puzzle) => puzzle.id === puzzleId)
}

function setsForPuzzle(puzzleId: AlgorithmPuzzleId): AlgorithmSetSummary[] {
  return algorithmSetSummaries.filter((set) => set.puzzleId === puzzleId)
}

function getNotationGuide(puzzleId: string | undefined): NotationGuideSummary | undefined {
  return notationGuides.find((guide) => guide.id === puzzleId)
}

function metadataForPath(
  path: string,
  locale: SeoLocale,
): Omit<SeoMetadata, 'canonicalUrl' | 'htmlLang' | 'locale' | 'noindex' | 'path'> | undefined {
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

  if (path === '/sites') {
    return {
      breadcrumbs: [breadcrumb(locale, 'sites', '/sites')],
      description: localeCopy.sitesDescription,
      itemList: cubingSiteItems,
      jsonLdKind: 'item-list',
      title: localeCopy.sitesTitle,
    }
  }

  if (path === '/stores') {
    return {
      breadcrumbs: [breadcrumb(locale, 'stores', '/stores')],
      description: localeCopy.storesDescription,
      itemList: cubingStoreItems,
      jsonLdKind: 'item-list',
      title: localeCopy.storesTitle,
    }
  }

  if (path === '/records/world') {
    return {
      breadcrumbs: [breadcrumb(locale, 'worldRecords', '/records/world')],
      description: localeCopy.worldRecordsDescription,
      title: localeCopy.worldRecordsTitle,
    }
  }

  if (path === '/algorithms') {
    return {
      breadcrumbs: [breadcrumb(locale, 'algorithms', '/algorithms')],
      description: localeCopy.algorithmsDescription,
      itemList: algorithmPuzzles.map((puzzle) => ({ name: puzzle.title, path: puzzle.path })),
      jsonLdKind: 'item-list',
      title: localeCopy.algorithmsTitle,
    }
  }

  const algorithmPuzzleMatch = path.match(/^\/algorithms\/([^/]+)$/)
  if (algorithmPuzzleMatch !== null) {
    const puzzle = getAlgorithmPuzzle(algorithmPuzzleMatch[1])

    if (puzzle === undefined) {
      return undefined
    }

    const puzzleSets = setsForPuzzle(puzzle.id)

    return {
      breadcrumbs: [
        breadcrumb(locale, 'algorithms', '/algorithms'),
        { name: puzzle.title, path: puzzle.path },
      ],
      description: localeCopy.algorithmPuzzleDescription(puzzle.title),
      itemList: puzzleSets.map((set) => ({ name: set.title, path: set.path })),
      jsonLdKind: 'item-list',
      title: localeCopy.puzzleAlgorithmsTitle(puzzle.title),
    }
  }

  const algorithmSetMatch = path.match(/^\/algorithms\/([^/]+)\/([^/]+)$/)
  if (algorithmSetMatch !== null) {
    const puzzle = getAlgorithmPuzzle(algorithmSetMatch[1])
    const set = algorithmSetSummaries.find(
      (summary) =>
        summary.puzzleId === algorithmSetMatch[1] && summary.routeSlug === algorithmSetMatch[2],
    )

    if (puzzle === undefined || set === undefined) {
      return undefined
    }

    return {
      breadcrumbs: [
        breadcrumb(locale, 'algorithms', '/algorithms'),
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
      breadcrumbs: [
        breadcrumb(locale, 'notations', '/notations/3x3'),
        { name: guide.puzzle, path: guide.path },
      ],
      description: localeCopy.notationDescription(guide.puzzle),
      jsonLdKind: 'tech-article',
      title: localeCopy.notationTitle(guide.puzzle),
    }
  }

  return undefined
}

function breadcrumb(
  locale: SeoLocale,
  key:
    | 'algorithms'
    | 'channels'
    | 'home'
    | 'notations'
    | 'sites'
    | 'solver'
    | 'stores'
    | 'timer'
    | 'worldRecords',
  path: string,
): SeoBreadcrumb {
  const labels = copy[locale]

  return { name: labels[key], path }
}

function firstPathSegment(pathname: string): string {
  return pathname.split('/').filter(Boolean)[0] ?? ''
}

function normalizePath(path: string): string {
  const pathWithLeadingSlash =
    path === '' || path === '/' ? '/' : path.startsWith('/') ? path : `/${path}`

  return pathWithLeadingSlash === '/' ? '/' : pathWithLeadingSlash.replace(/\/+$/, '')
}

function withTrailingSlash(path: string): string {
  return path === '/' ? '/' : `${path}/`
}

export const seoIndexablePaths = [
  ...appRouteManifest
    .filter((route) => route.indexable && !route.path.includes(':'))
    .map((route) => route.path),
  ...algorithmPuzzles.map((puzzle) => puzzle.path),
  ...algorithmSetSummaries.map((set) => set.path),
  ...notationGuides
    .filter((guide) => guide.id !== 'clock' && guide.id !== 'skewb')
    .map((guide) => guide.path),
]

export const routableStaticPaths = [
  ...appRouteManifest.filter((route) => !route.path.includes(':')).map((route) => route.path),
  ...algorithmPuzzles.map((puzzle) => puzzle.path),
  ...algorithmSetSummaries.map((set) => set.path),
  ...notationGuides.map((guide) => guide.path),
]

export function isSeoIndexablePath(pathname: string): boolean {
  return seoIndexablePaths.includes(stripLocalePrefix(pathname))
}
