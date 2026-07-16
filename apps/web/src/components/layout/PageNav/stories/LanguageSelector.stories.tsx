import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router'
import { LanguageSelector } from '../LanguageSelector'

const meta = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/solve/']}>
        <div className='w-64 bg-sidebar p-2 text-sidebar-foreground'>
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
  render: () => <LanguageSelector locale='en-US' pagePath='/solve' />,
  title: 'Layout/LanguageSelector',
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}
