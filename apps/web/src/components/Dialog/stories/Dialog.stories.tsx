import type { Meta, StoryObj } from '@storybook/react-vite'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '..'

type DialogStoryArgs = {
  description: string
  title: string
}

const meta = {
  args: {
    description: 'Adjust the active solve without leaving the current page.',
    title: 'Solve settings',
  },
  render: ({ description, title }) => (
    <Dialog>
      <DialogTrigger asChild>
        <button className='rounded-md bg-primary px-4 py-2 text-primary-foreground' type='button'>
          Open dialog
        </button>
      </DialogTrigger>
      <DialogContent className='left-1/2 top-1/2 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 bg-background p-6'>
        <DialogTitle className='text-lg font-semibold'>{title}</DialogTitle>
        <DialogDescription className='mt-2 text-sm text-muted-foreground'>
          {description}
        </DialogDescription>
      </DialogContent>
    </Dialog>
  ),
  title: 'Components/Dialog',
} satisfies Meta<DialogStoryArgs>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {}
