import { InspectionBar } from "@components/timer/InspectionBar";
import { PenaltyControls } from "@components/timer/PenaltyControls";
import { TimerDisplay } from "@components/timer/TimerDisplay";
import { TimerStatusBar } from "@components/timer/TimerStatusBar";
import type { TimerPenalty } from "@core/timer/penalties";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useActiveTimerSession } from "../../hooks/useActiveTimerSession";
import { useKeyboardTimer } from "../../hooks/useKeyboardTimer";
import { useTimerMachine } from "../../hooks/useTimerMachine";
import { useTouchTimer } from "../../hooks/useTouchTimer";
import { useTimerSettingsStore } from "../../timerSettingsStore";
import { useTimerStore } from "../../timerStore";

type TimerRuntimeProps = {
  disabled: boolean;
  resetSignal: number;
  onSolveComplete: (rawTimeMs: number, penalty: TimerPenalty) => void;
};

export function TimerRuntime({
  disabled,
  resetSignal,
  onSolveComplete,
}: TimerRuntimeProps) {
  const { t } = useTranslation();
  const activeSession = useActiveTimerSession();
  const holdToStartMs = useTimerSettingsStore((state) => state.holdToStartMs);
  const inspectionEnabled = useTimerSettingsStore(
    (state) => state.inspectionEnabled,
  );
  const showMilliseconds = useTimerSettingsStore(
    (state) => state.showMilliseconds,
  );
  const updateLatestSolvePenalty = useTimerStore(
    (state) => state.updateLatestSolvePenalty,
  );
  const lastSolve = activeSession.solves.at(-1);
  const timer = useTimerMachine({
    holdToStartMs,
    inspectionEnabled,
    onSolveComplete,
  });
  const timerRef = useRef(timer);
  timerRef.current = timer;
  const touchHandlers = useTouchTimer(timer, disabled);

  useKeyboardTimer(timer, disabled);

  useEffect(() => {
    if (resetSignal > 0) {
      timerRef.current.resetStopped();
    }
  }, [resetSignal]);

  return (
    <section className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto_auto] gap-2 overflow-hidden">
      <TimerDisplay
        aria-label={t("timer.displayLabel")}
        aria-disabled={disabled}
        className="h-full"
        data-timer-display="true"
        elapsedMs={timer.elapsedMs}
        showMilliseconds={showMilliseconds}
        status={timer.status}
        {...touchHandlers}
      >
        <PenaltyControls
          compact
          className="mt-5 w-full max-w-44"
          disabled={lastSolve === undefined}
          penalty={lastSolve?.penalty ?? "ok"}
          onPenaltyChange={updateLatestSolvePenalty}
        />
      </TimerDisplay>
      <TimerStatusBar status={timer.status} />
      <InspectionBar
        enabled={inspectionEnabled}
        penalty={timer.inspectionPenalty}
        remainingMs={timer.inspectionRemainingMs}
      />
    </section>
  );
}
