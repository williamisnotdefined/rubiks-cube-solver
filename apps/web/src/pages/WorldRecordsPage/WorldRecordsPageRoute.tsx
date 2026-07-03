import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WorldRecordsPage } from './WorldRecordsPage'

const queryClient = new QueryClient()

export function WorldRecordsPageRoute() {
  return (
    <QueryClientProvider client={queryClient}>
      <WorldRecordsPage />
    </QueryClientProvider>
  )
}
