import { SolvePage } from './pages/SolvePage/SolvePage'
import { ScanDatasetPage } from './pages/ScanDatasetPage/ScanDatasetPage'

function App() {
  if (
    import.meta.env.VITE_ENABLE_SCAN_DATASET === 'true' &&
    typeof window !== 'undefined' &&
    window.location.pathname === '/dev/scan-dataset'
  ) {
    return <ScanDatasetPage />
  }

  return <SolvePage />
}

export default App
