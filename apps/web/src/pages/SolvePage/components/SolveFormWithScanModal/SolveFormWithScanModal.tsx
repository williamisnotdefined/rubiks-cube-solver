import { Button } from '@components/Button'
import { trackScanOpened } from '@src/analytics/analytics'
import { Camera } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ScanCubeModalProps } from '../../scan/ScanCubeModal'
import { SolveForm, type SolveFormProps } from '../../solve/SolveForm'

const ScanCubeModal = lazy(() =>
  import('../../scan/ScanCubeModal').then((module) => ({ default: module.ScanCubeModal })),
)

type SolveFormWithScanModalProps = Omit<SolveFormProps, 'onPuzzleChange' | 'scanAction'> & {
  onPuzzleChange: SolveFormProps['onPuzzleChange']
  scanAvailable: boolean
  scanModalProps: Omit<ScanCubeModalProps, 'onClose'>
}

export function SolveFormWithScanModal({
  onPuzzleChange,
  scanAvailable,
  scanModalProps,
  ...solveFormProps
}: SolveFormWithScanModalProps) {
  const { t } = useTranslation()
  const [scanModalOpen, setScanModalOpen] = useState(false)
  const scanModalStateKey = `${solveFormProps.selectedPuzzleSlug}:${scanAvailable}`
  const [previousScanModalStateKey, setPreviousScanModalStateKey] = useState(scanModalStateKey)

  if (scanModalStateKey !== previousScanModalStateKey) {
    setPreviousScanModalStateKey(scanModalStateKey)
    setScanModalOpen(false)
  }

  function closeScanModal() {
    setScanModalOpen(false)
  }

  function handlePuzzleChange(nextPuzzleSlug: string) {
    closeScanModal()
    onPuzzleChange(nextPuzzleSlug)
  }

  return (
    <>
      <SolveForm
        {...solveFormProps}
        scanAction={
          <Button
            aria-label={t('solve.form.scanCube')}
            className='aspect-square h-9 w-9 px-0 py-0'
            disabled={!scanAvailable}
            title={scanAvailable ? undefined : t('solve.form.scanUnavailableForPuzzle')}
            type='button'
            variant='outline'
            onClick={() => {
              trackScanOpened(solveFormProps.selectedPuzzleSlug)
              setScanModalOpen(true)
            }}
          >
            <Camera aria-hidden='true' />
          </Button>
        }
        onPuzzleChange={handlePuzzleChange}
      />
      {scanModalOpen && scanAvailable ? (
        <Suspense fallback={null}>
          <ScanCubeModal {...scanModalProps} onClose={closeScanModal} />
        </Suspense>
      ) : null}
    </>
  )
}
