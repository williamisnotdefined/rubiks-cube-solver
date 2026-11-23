import { useRef } from 'react'
import { useHeroFloaters } from '@src/motion/useHeroFloaters'

export function HeroFloatingObjects() {
  const rootRef = useRef<HTMLDivElement>(null)
  useHeroFloaters({ rootRef })

  return (
    <div aria-hidden='true' className='hero-floaters' data-hero-floaters='true' ref={rootRef}>
      <div className='hero-orbit' />

      <div className='hero-floater hero-floater--cubie-a'>
        <div className='hero-floater-inner'>
          <div className='hero-cubie hero-cubie--blue'>
            <span className='hero-cubie-face hero-cubie-face--front' />
            <span className='hero-cubie-face hero-cubie-face--right' />
            <span className='hero-cubie-face hero-cubie-face--top' />
          </div>
        </div>
      </div>

      <div className='hero-floater hero-floater--cubie-b'>
        <div className='hero-floater-inner'>
          <div className='hero-cubie hero-cubie--green'>
            <span className='hero-cubie-face hero-cubie-face--front' />
            <span className='hero-cubie-face hero-cubie-face--right' />
            <span className='hero-cubie-face hero-cubie-face--top' />
          </div>
        </div>
      </div>

      <div className='hero-floater hero-floater--cubie-two'>
        <div className='hero-floater-inner'>
          <div className='hero-cubie hero-cubie--two'>
            <span className='hero-cubie-face hero-cubie-face--front hero-cubie-face--grid'>
              <span className='hero-cubie-sticker' />
              <span className='hero-cubie-sticker' />
              <span className='hero-cubie-sticker' />
              <span className='hero-cubie-sticker' />
            </span>
            <span className='hero-cubie-face hero-cubie-face--right hero-cubie-face--grid'>
              <span className='hero-cubie-sticker' />
              <span className='hero-cubie-sticker' />
              <span className='hero-cubie-sticker' />
              <span className='hero-cubie-sticker' />
            </span>
            <span className='hero-cubie-face hero-cubie-face--top hero-cubie-face--grid'>
              <span className='hero-cubie-sticker' />
              <span className='hero-cubie-sticker' />
              <span className='hero-cubie-sticker' />
              <span className='hero-cubie-sticker' />
            </span>
          </div>
        </div>
      </div>

      <div className='hero-floater hero-floater--clock'>
        <div className='hero-floater-inner'>
          <div className='hero-clock'>
            <span className='hero-clock-crown' />
            <span className='hero-clock-hand hero-clock-hand--hour' />
            <span className='hero-clock-hand hero-clock-hand--minute' />
          </div>
        </div>
      </div>

      <span className='hero-floater hero-chip hero-chip--r'>
        <span className='hero-floater-inner'>R</span>
      </span>
      <span className='hero-floater hero-chip hero-chip--u'>
        <span className='hero-floater-inner'>U&apos;</span>
      </span>
      <span className='hero-floater hero-chip hero-chip--f'>
        <span className='hero-floater-inner'>F2</span>
      </span>
      <span className='hero-floater hero-chip hero-chip--b2'>
        <span className='hero-floater-inner'>B2</span>
      </span>
      <span className='hero-floater hero-chip hero-chip--wr'>
        <span className='hero-floater-inner'>WR 3.13</span>
      </span>

      <span className='hero-floater hero-sticker hero-sticker--yellow'>
        <span className='hero-floater-inner' />
      </span>
      <span className='hero-floater hero-sticker hero-sticker--blue'>
        <span className='hero-floater-inner' />
      </span>
      <span className='hero-floater hero-sticker hero-sticker--white'>
        <span className='hero-floater-inner' />
      </span>
    </div>
  )
}
