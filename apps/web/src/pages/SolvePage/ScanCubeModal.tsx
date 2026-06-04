import { EvenCubeScanModal } from './EvenCubeScanModal'
import { OddCubeScanModal, type ScanCubeModalProps } from './OddCubeScanModal'

export function ScanCubeModal(props: ScanCubeModalProps) {
  if (props.puzzleSlug === 'cube-2x2x2') {
    return <EvenCubeScanModal {...props} />
  }

  return <OddCubeScanModal {...props} />
}
