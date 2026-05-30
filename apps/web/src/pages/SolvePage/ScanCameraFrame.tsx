import { memo, type RefObject } from 'react'
import type { ScanAnalysisPoint } from '@api/scan'

type ScanCameraStatus = 'idle' | 'loading' | 'ready' | 'error'

type ScanCameraFrameProps = {
  cameraMessage?: string
  cameraStatus: ScanCameraStatus
  faceQuad?: readonly ScanAnalysisPoint[]
  photoDataUrl?: string
  stickerPolygons?: readonly {
    confidence: number
    index: number
    polygon: readonly ScanAnalysisPoint[]
  }[]
  videoRef: RefObject<HTMLVideoElement | null>
}

export const ScanCameraFrame = memo(function ScanCameraFrame({
  cameraMessage,
  cameraStatus,
  faceQuad = [],
  photoDataUrl,
  stickerPolygons = [],
  videoRef,
}: ScanCameraFrameProps) {
  return (
    <div className="relative aspect-square w-full max-w-[32rem] justify-self-center overflow-hidden border border-[#2b2b2b] bg-[#070707]">
      <video
        className={photoDataUrl === undefined ? 'block size-full object-cover' : 'hidden'}
        muted
        playsInline
        ref={videoRef}
      />
      {photoDataUrl === undefined ? null : (
        <img className="block size-full object-cover" src={photoDataUrl} alt="Captured cube face" />
      )}
      {photoDataUrl === undefined ? null : (
        <svg className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 100 100">
          {faceQuad.length === 4 ? (
            <polygon
              fill="none"
              points={svgPoints(faceQuad)}
              stroke="#f7f7f7"
              strokeOpacity="0.85"
              strokeWidth="0.7"
            />
          ) : null}
          {stickerPolygons.map((sticker) => (
            <polygon
              fill="none"
              key={sticker.index}
              points={svgPoints(sticker.polygon)}
              stroke={sticker.confidence < 0.3 ? '#fbbf24' : '#22c55e'}
              strokeOpacity="0.85"
              strokeWidth="0.45"
            />
          ))}
        </svg>
      )}
      <div className="pointer-events-none absolute left-1/2 top-1/2 grid aspect-square w-[72%] -translate-x-1/2 -translate-y-1/2 grid-cols-3 grid-rows-3 gap-1 border border-[#f7f7f7]/80 p-1">
        {Array.from({ length: 9 }, (_, index) => (
          <div className="border border-[#f7f7f7]/55" key={index} />
        ))}
      </div>
      {cameraStatus === 'loading' ? (
        <div className="absolute inset-0 grid place-items-center bg-[#070707]/70 text-sm font-extrabold uppercase tracking-[0.16em] text-[#f7f7f7]">
          Opening camera
        </div>
      ) : null}
      {cameraStatus === 'error' ? (
        <div className="absolute inset-0 grid place-items-center bg-[#070707]/85 p-4 text-center text-sm font-semibold leading-relaxed text-[#f7f7f7]">
          {cameraMessage} You can still fill the grid manually.
        </div>
      ) : null}
    </div>
  )
})

function svgPoints(points: readonly ScanAnalysisPoint[]): string {
  return points.map((point) => `${point.x * 100},${point.y * 100}`).join(' ')
}
