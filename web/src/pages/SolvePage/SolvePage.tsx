import { SolveVisualizationStage } from './components/SolveVisualizationStage'
import { useSolvePageController } from './hooks/useSolvePageController'
import { ScanCubeModal } from './scan/ScanCubeModal'
import { NoSolutionLimitsModal } from './solve/NoSolutionLimitsModal'
import { SolveForm } from './solve/SolveForm'
import { SolveResult } from './solve/SolveResult'
import { SolutionPlayback } from './solve/SolutionPlayback'

export function SolvePage() {
  const solvePage = useSolvePageController()

  return (
    <main className="app-shell min-h-0 flex-1 overflow-auto bg-app-bg px-3 py-4 text-app-text sm:px-5 sm:py-6">
      <section className="mx-auto grid w-full max-w-4xl content-start justify-items-center gap-4">
        <SolveVisualizationStage {...solvePage.visualization} />
        <SolveForm {...solvePage.form} />
        <SolveResult {...solvePage.result} />
        {solvePage.playback !== undefined ? (
          <SolutionPlayback {...solvePage.playback} />
        ) : null}
        {solvePage.scanModal !== undefined ? (
          <ScanCubeModal {...solvePage.scanModal} />
        ) : null}
        {solvePage.limitFailureModal !== undefined ? (
          <NoSolutionLimitsModal {...solvePage.limitFailureModal} />
        ) : null}
      </section>
    </main>
  )
}
