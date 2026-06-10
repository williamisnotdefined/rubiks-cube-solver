import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Checkbox } from '../Checkbox'
import { Field } from '../Field'
import { Loader3x3 } from '../Loader3x3'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../Select'
import { Switch } from '../Switch'

const cubeMocks = vi.hoisted(() => {
  const mocks = {
    move: vi.fn((move: unknown) => {
      void move

      return Promise.resolve()
    }),
    register: vi.fn(),
    reset: vi.fn(),
  }

  mocks.register.mockImplementation(() => {
    if (!customElements.get('rubiks-cube')) {
      customElements.define(
        'rubiks-cube',
        class extends HTMLElement {
          move(move: unknown) {
            return mocks.move(move)
          }

          reset() {
            mocks.reset()
          }
        },
      )
    }
  })

  return mocks
})

vi.mock('@rubiks-cube-solver/rubiks-cube/view', () => ({
  RubiksCubeElement: { register: cubeMocks.register },
}))

describe('Field', () => {
  it('renders a visible label with children', () => {
    render(
      <Field label="Scramble">
        <input />
      </Field>,
    )

    expect(screen.getByText('Scramble')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })
})

describe('Select', () => {
  it('selects an item through the accessible combobox', async () => {
    const user = userEvent.setup()
    render(<SelectHarness />)

    await user.click(screen.getByRole('combobox', { name: 'Max nodes' }))
    await user.click(screen.getByRole('option', { name: '15' }))

    expect(screen.getByRole('combobox', { name: 'Max nodes' })).toHaveTextContent('15')
  })
})

describe('Switch', () => {
  it('toggles checked state', async () => {
    const user = userEvent.setup()
    render(<SwitchHarness />)

    const control = screen.getByRole('switch', { name: 'Inspection' })
    expect(control).toHaveAttribute('aria-checked', 'false')

    await user.click(control)

    expect(control).toHaveAttribute('aria-checked', 'true')
  })
})

describe('Checkbox', () => {
  it('toggles checked state', async () => {
    const user = userEvent.setup()
    render(<CheckboxHarness />)

    const control = screen.getByRole('checkbox', { name: 'Use inspection' })
    expect(control).toHaveAttribute('aria-checked', 'false')

    await user.click(control)

    expect(control).toHaveAttribute('aria-checked', 'true')
  })
})

describe('Loader3x3', () => {
  it('renders an accessible loading indicator by default', () => {
    render(<Loader3x3 />)

    expect(screen.getByLabelText('Loading')).toBeInTheDocument()
  })

  it('can be decorative inside labelled controls', () => {
    const { container } = render(<Loader3x3 decorative />)

    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
  })

  it('renders the rubiks-cube custom element', async () => {
    const { container } = render(<Loader3x3 />)

    await waitFor(() => {
      expect(container.querySelector('rubiks-cube')).toBeInTheDocument()
    })
  })

  it('moves the rendered cube while mounted', async () => {
    cubeMocks.move.mockClear()
    cubeMocks.reset.mockClear()
    const { container } = render(<Loader3x3 />)

    await waitFor(() => {
      expect(container.querySelector('rubiks-cube')).toBeInTheDocument()
    })
    await waitFor(() => expect(cubeMocks.move).toHaveBeenCalled())
    expect(cubeMocks.reset).toHaveBeenCalled()
  })

  it('keeps explicit size overrides unambiguous', () => {
    const { container } = render(<Loader3x3 className="size-8" />)

    expect(container.firstElementChild).toHaveClass('size-8')
    expect(container.firstElementChild).not.toHaveClass('size-10')
  })
})

function SelectHarness() {
  const [value, setValue] = useState('10')

  return (
    <Select value={value} onValueChange={setValue}>
      <SelectTrigger aria-label="Max nodes">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="10">10</SelectItem>
        <SelectItem value="15">15</SelectItem>
      </SelectContent>
    </Select>
  )
}

function SwitchHarness() {
  const [checked, setChecked] = useState(false)

  return <Switch aria-label="Inspection" checked={checked} onCheckedChange={setChecked} />
}

function CheckboxHarness() {
  const [checked, setChecked] = useState(false)

  return (
    <Checkbox
      aria-label="Use inspection"
      checked={checked}
      onCheckedChange={(nextChecked) => setChecked(nextChecked === true)}
    />
  )
}
