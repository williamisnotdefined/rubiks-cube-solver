export function HeroFloatingObjects() {
  return (
    <div aria-hidden='true' className='hero-floaters' data-hero-floaters='true'>
      <div className='hero-orbit' />

      <div className='hero-floater hero-floater--cubie-a'>
        <div className='hero-cubie hero-cubie--blue'>
          <span className='hero-cubie-face hero-cubie-face--front' />
          <span className='hero-cubie-face hero-cubie-face--right' />
          <span className='hero-cubie-face hero-cubie-face--top' />
        </div>
      </div>

      <div className='hero-floater hero-floater--cubie-b'>
        <div className='hero-cubie hero-cubie--green'>
          <span className='hero-cubie-face hero-cubie-face--front' />
          <span className='hero-cubie-face hero-cubie-face--right' />
          <span className='hero-cubie-face hero-cubie-face--top' />
        </div>
      </div>

      <span className='hero-floater hero-chip hero-chip--r'>R</span>
      <span className='hero-floater hero-chip hero-chip--u'>U&apos;</span>
      <span className='hero-floater hero-chip hero-chip--f'>F2</span>

      <span className='hero-floater hero-sticker hero-sticker--yellow' />
      <span className='hero-floater hero-sticker hero-sticker--blue' />
    </div>
  )
}
