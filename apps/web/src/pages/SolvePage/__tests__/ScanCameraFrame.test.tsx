import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ScanCameraFrame } from '../ScanCameraFrame'

describe('ScanCameraFrame', () => {
  it('renders sticker detection boxes without the old fixed guide grid', () => {
    const { container } = render(
      <ScanCameraFrame
        cameraStatus="ready"
        detectionMode="contour"
        faceConfidence={0.8}
        faceQuad={[
          { x: 0.02, y: 0.12 },
          { x: 0.96, y: 0.03 },
          { x: 0.98, y: 0.94 },
          { x: 0.04, y: 0.86 },
        ]}
        gridConfidence={0.81}
        gridDetections={[
          {
            bbox: { height: 0.18, width: 0.18, x: 0.25, y: 0.25 },
            column: 0,
            confidence: 0.9,
            index: 0,
            row: 0,
            symbol: 'F',
          },
        ]}
        gridStatus="partial"
        stickerPolygons={[
          {
            confidence: 0.8,
            index: 0,
            polygon: [
              { x: 0.1, y: 0.1 },
              { x: 0.8, y: 0.1 },
              { x: 0.8, y: 0.8 },
              { x: 0.1, y: 0.8 },
            ],
          },
        ]}
        temporalConsensus={{
          bboxStability: 0.9,
          faceConfidence: 0.8,
          framesRejected: 1,
          framesSeen: 7,
          framesUsed: 6,
          gridConfidence: 0.81,
          rejectReasons: [],
          status: 'ready',
          stickers: [],
          temporalAgreement: 0.93,
        }}
        videoRef={{ current: null }}
      />,
    )

    expect(screen.getByText('G 90')).toBeInTheDocument()
    expect(screen.getByText('1/9 stickers found')).toBeInTheDocument()
    expect(screen.getByText('grid 81%')).toBeInTheDocument()
    expect(screen.getByText('consensus 93% 6 frames')).toBeInTheDocument()
    expect(screen.queryByText('contour 80%')).not.toBeInTheDocument()
    expect(container.querySelector('polygon')).not.toBeInTheDocument()
    expect(container.querySelector('.grid-cols-3')).not.toBeInTheDocument()
  })
})
