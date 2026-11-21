type GsapModule = typeof import('gsap')
type SplitTextModule = typeof import('gsap/SplitText')

let gsapPromise: Promise<GsapModule> | undefined
let splitTextPromise: Promise<SplitTextModule> | undefined

export function loadGsap(): Promise<GsapModule> {
  gsapPromise ??= import('gsap')
  return gsapPromise
}

export function loadSplitText(): Promise<SplitTextModule> {
  splitTextPromise ??= import('gsap/SplitText')
  return splitTextPromise
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function hasFinePointer(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  return window.matchMedia('(pointer: fine)').matches
}
