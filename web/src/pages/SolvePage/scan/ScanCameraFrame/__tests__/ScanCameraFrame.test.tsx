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

  it('hides low-confidence sticker detection boxes', () => {
    render(
      <ScanCameraFrame
        cameraStatus="ready"
        detectionMode="tile_detector"
        tileDetections={[
          {
            bbox: { height: 0.18, width: 0.18, x: 0.25, y: 0.25 },
            confidence: 0.39,
            symbol: 'F',
          },
        ]}
        videoRef={{ current: null }}
      />,
    )

    expect(screen.queryByText('G 39')).not.toBeInTheDocument()
    expect(screen.queryByText('1/9 stickers found')).not.toBeInTheDocument()
  })

  it('renders loading and camera error overlays', () => {
    const { rerender } = render(<ScanCameraFrame cameraStatus="loading" videoRef={{ current: null }} />)

    expect(screen.getByText('Opening camera')).toBeInTheDocument()

    rerender(
      <ScanCameraFrame
        cameraMessage="Permission denied."
        cameraStatus="error"
        videoRef={{ current: null }}
      />,
    )

    expect(screen.getByText('Permission denied. You can still fill the grid manually.')).toBeInTheDocument()
  })

  it('renders tracking, rejected, and non-ready temporal labels', () => {
    const { rerender } = render(
      <ScanCameraFrame
        cameraStatus="ready"
        stableFrameCount={2}
        trackingStatus="tracking"
        videoRef={{ current: null }}
      />,
    )

    expect(screen.getByText('tracking 2/6')).toBeInTheDocument()

    rerender(
      <ScanCameraFrame
        cameraStatus="ready"
        detectionMode="rejected"
        temporalConsensus={{
          bboxStability: 0.3,
          faceConfidence: 0.8,
          framesRejected: 1,
          framesSeen: 6,
          framesUsed: 5,
          rejectReasons: [],
          status: 'unstable',
          stickers: [],
          temporalAgreement: 0.5,
          tileConfidence: 0.7,
        }}
        videoRef={{ current: null }}
      />,
    )

    expect(screen.getByText('looking for cube')).toBeInTheDocument()
    expect(screen.getByText('geometry unstable 5 frames')).toBeInTheDocument()

    rerender(
      <ScanCameraFrame
        cameraStatus="ready"
        stableFrameCount={6}
        temporalConsensus={{
          bboxStability: 0.8,
          faceConfidence: 0.8,
          framesRejected: 0,
          framesSeen: 6,
          framesUsed: 4,
          rejectReasons: [],
          status: 'color_disagreement',
          stickers: [],
          temporalAgreement: 0.5,
          tileConfidence: 0.7,
        }}
        trackingStatus="holding_steady"
        videoRef={{ current: null }}
      />,
    )

    expect(screen.getByText('hold steady 6/6')).toBeInTheDocument()
    expect(screen.getByText('color unstable 4 frames')).toBeInTheDocument()
  })

  it('labels a complete sticker grid as ready', () => {
    render(
      <ScanCameraFrame
        cameraStatus="ready"
        tileDetections={Array.from({ length: 9 }, (_, index) => ({
          bbox: { height: 0.18, width: 0.18, x: 0.25 + (index % 3) * 0.25, y: 0.25 + Math.floor(index / 3) * 0.25 },
          confidence: 0.9,
          symbol: index === 4 ? 'U' : 'F',
        }))}
        temporalConsensus={{
          bboxStability: 0.9,
          faceConfidence: 0.8,
          framesRejected: 0,
          framesSeen: 3,
          framesUsed: 3,
          rejectReasons: [],
          status: 'collecting',
          stickers: [],
          temporalAgreement: 0.5,
          tileConfidence: 0.7,
        }}
        videoRef={{ current: null }}
      />,
    )

    expect(screen.getByText('9/9 stickers ready')).toBeInTheDocument()
    expect(screen.getByText('consensus 3/6')).toBeInTheDocument()
  })
})
