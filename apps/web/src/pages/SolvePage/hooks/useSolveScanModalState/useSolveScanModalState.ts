import { useState } from 'react'

export function useSolveScanModalState(scanAvailable: boolean) {
  const [scanModalOpen, setScanModalOpen] = useState(false)
  const [scanSessionSolving, setScanSessionSolving] = useState(false)

  function handleScanClick() {
    if (scanAvailable) {
      setScanModalOpen(true)
    }
  }

  return {
    closeScanModal: () => setScanModalOpen(false),
    onScanClick: handleScanClick,
    onScanSessionSolvingChange: setScanSessionSolving,
    scanModalOpen: scanModalOpen && scanAvailable,
    scanSessionSolving,
  }
}
