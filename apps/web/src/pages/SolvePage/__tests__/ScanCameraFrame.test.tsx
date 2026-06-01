import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ScanCameraFrame } from '../ScanCameraFrame'

describe('ScanCameraFrame', () => {
  it('renders sticker detection boxes without the old fixed guide grid', () => {
    const { container } = render(
      <ScanCameraFrame
        cameraStatus="ready"
        detectionMode="legacy_geometry"
        tileDetections={[
          {
            bbox: { height: 0.18, width: 0.18, x: 0.25, y: 0.25 },
            confidence: 0.9,
            symbol: 'F',
          },
        ]}
        temporalConsensus={{
          bboxStability: 0.9,
          faceConfidence: 0.8,
          framesRejected: 1,
          framesSeen: 7,
          framesUsed: 6,
          rejectReasons: [],
          status: 'ready',
          stickers: [],
          temporalAgreement: 0.93,
          tileConfidence: 0.81,
        }}
        videoRef={{ current: null }}
      />,
    )

    expect(screen.getByText('G 90')).toBeInTheDocument()
    expect(screen.getByText('1/9 stickers found')).toBeInTheDocument()
    expect(screen.getByText('stickers 90%')).toBeInTheDocument()
    expect(screen.getByText('consensus 93% 6 frames')).toBeInTheDocument()
    expect(screen.queryByText('legacy_geometry 80%')).not.toBeInTheDocument()
    expect(container.querySelector('polygon')).not.toBeInTheDocument()
    expect(container.querySelector('.grid-cols-3')).not.toBeInTheDocument()
  })
})
