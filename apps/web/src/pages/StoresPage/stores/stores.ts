export const storeCountryCodes = ['AU', 'BR', 'CN', 'ES', 'GB', 'IN', 'JP', 'US'] as const

export type StoreCountryCode = (typeof storeCountryCodes)[number]

export type CubingStore = {
  countryCode: StoreCountryCode
  host: string
  imageClassName?: string
  id: string
  imagePath?: string
  name: string
  url: string
}

export const cubingStores: readonly CubingStore[] = [
  {
    countryCode: 'BR',
    host: 'cuberbrasil.com',
    imageClassName: 'dark:invert',
    id: 'cuber-brasil',
    imagePath: '/sites/cuber-brasil.png',
    name: 'Cuber Brasil',
    url: 'https://www.cuberbrasil.com/',
  },
  {
    countryCode: 'AU',
    host: 'dailypuzzles.com.au',
    id: 'daily-puzzles',
    imagePath: '/sites/dailypuzzles.png',
    name: 'DailyPuzzles',
    url: 'https://dailypuzzles.com.au/',
  },
  {
    countryCode: 'CN',
    host: 'cubezz.com',
    id: 'cubezz',
    imagePath: '/sites/cubezz.png',
    name: 'Cubezz',
    url: 'https://www.cubezz.com/',
  },
  {
    countryCode: 'CN',
    host: 'ziicube.com',
    id: 'ziicube',
    imagePath: '/sites/ziicube.png',
    name: 'ZiiCube',
    url: 'https://www.ziicube.com/',
  },
  {
    countryCode: 'ES',
    host: 'kubekings.com',
    id: 'kubekings',
    name: 'Kubekings',
    url: 'https://kubekings.com/',
  },
  {
    countryCode: 'GB',
    host: 'kewbz.co.uk',
    id: 'kewbzuk',
    imagePath: '/sites/kewbzuk.png',
    name: 'KewbzUK',
    url: 'https://kewbz.co.uk/',
  },
  {
    countryCode: 'IN',
    host: 'cubelelo.com',
    id: 'cubelelo',
    name: 'Cubelelo',
    url: 'https://www.cubelelo.com/',
  },
  {
    countryCode: 'JP',
    host: 'store.tribox.com',
    id: 'tribox',
    name: 'tribox',
    url: 'https://store.tribox.com/',
  },
  {
    countryCode: 'US',
    host: 'speedcubeshop.com',
    id: 'speedcubeshop',
    imagePath: '/sites/speedcubeshop.png',
    name: 'SpeedCubeShop',
    url: 'https://speedcubeshop.com/',
  },
  {
    countryCode: 'US',
    host: 'thecubicle.com',
    id: 'the-cubicle',
    imagePath: '/sites/the-cubicle.png',
    name: 'The Cubicle',
    url: 'https://www.thecubicle.com/',
  },
]
