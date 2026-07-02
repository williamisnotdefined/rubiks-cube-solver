import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SolvePage } from './SolvePage'

const queryClient = new QueryClient()

export function SolvePageRoute() {
  return (
    <QueryClientProvider client={queryClient}>
      <SolvePage />
    </QueryClientProvider>
  )
}
