import type { Meta, StoryObj } from '@storybook/react-vite'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '..'

type TableStoryArgs = {
  caption: string
}

const rows = [
  { event: '3x3x3 Cube', result: '4.90', type: 'Single' },
  { event: '2x2x2 Cube', result: '0.43', type: 'Single' },
  { event: 'Pyraminx', result: '1.02', type: 'Average' },
]

const meta = {
  args: {
    caption: 'Selected world records',
  },
  render: ({ caption }) => (
    <Table className='min-w-[32rem]'>
      <TableCaption>{caption}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Event</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Result</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.event}>
            <TableCell>{row.event}</TableCell>
            <TableCell>{row.type}</TableCell>
            <TableCell>{row.result}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
  title: 'Components/Table',
} satisfies Meta<TableStoryArgs>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {}
