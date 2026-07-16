import type { Meta, StoryObj } from '@storybook/react-vite'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '..'

type SheetStoryArgs = {
  side: 'bottom' | 'left' | 'right' | 'top'
  title: string
}

const meta = {
  argTypes: {
    side: {
      control: 'select',
      options: ['right', 'left', 'top', 'bottom'],
    },
  },
  args: {
    side: 'right',
    title: 'Record details',
  },
  render: ({ side, title }) => (
    <Sheet>
      <SheetTrigger asChild>
        <button className='rounded-md bg-primary px-4 py-2 text-primary-foreground' type='button'>
          Open sheet
        </button>
      </SheetTrigger>
      <SheetContent closeLabel='Close sheet' side={side}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>A deterministic panel for secondary details.</SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  ),
  title: 'Components/Sheet',
} satisfies Meta<SheetStoryArgs>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {}
