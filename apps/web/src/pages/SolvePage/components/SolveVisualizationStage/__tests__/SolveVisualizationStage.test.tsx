import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SolveVisualizationStage } from '../SolveVisualizationStage'

describe('SolveVisualizationStage', () => {
  it('renders an unavailable message when the puzzle has no cube visualization', () => {
    render(
      <SolveVisualizationStage
        cubeRef={createRef()}
        loadRequested={false}
        onReady={vi.fn()}
        onLoadRequest={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('region', {
        name: 'Visualization is not available for this puzzle yet.',
      }),
    ).toHaveTextContent('Visualization is not available for this puzzle yet.')
  })
})
