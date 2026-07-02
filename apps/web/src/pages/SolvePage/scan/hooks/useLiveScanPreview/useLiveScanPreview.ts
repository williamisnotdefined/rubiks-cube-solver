import {
  useAnalyzeScanFace,
  type AnalyzeScanFaceResponse,
  type ScanDetectionBox,
} from "@api/scan";
import type { ScanFaceSymbol } from "@api/solver/types";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useTranslation } from "react-i18next";
import {
  captureScanPreviewImage,
  type CapturedScanImage,
} from "../../scanCapture";
import {
  defaultTemporalConsensusOptions,
  hasCompleteTileDetections,
  isTemporalConsensusReady,
  tileAssignmentFromAnalysis,
  type TemporalFaceConsensus,
} from "../../scanTemporalConsensus";
import { validStickerTileDetections } from "../../scanTileDetections";
import { useTemporalScanConsensus } from "../useTemporalScanConsensus";

export type LiveScanPreviewStatus =
  | "idle"
  | "searching"
  | "detecting_stickers"
  | "tracking"
  | "holding_steady"
  | "error";

type UseLiveScanPreviewOptions = {
  enabled: boolean;
  expectedCenter: ScanFaceSymbol;
  gridSize?: 2 | 3;
  videoRef: RefObject<HTMLVideoElement | null>;
};

type UseLiveScanPreviewResult = {
  latestAnalysis?: AnalyzeScanFaceResponse;
  latestCapture?: CapturedScanImage;
  acknowledgeAutoFill: () => void;
  message: string;
  resetAutoFill: () => void;
  shouldAutoFill: boolean;
  stableFrameCount: number;
  status: LiveScanPreviewStatus;
  temporalConsensus: TemporalFaceConsensus;
};

const previewIntervalMs = 750;
const minFaceConfidence = 0.5;
const goodFaceConfidence = 0.72;
const minTileConfidence = 0.62;
const stableFrameTarget = 6;
const maxTileMovement = 0.025;
const criticalQualityWarnings = new Set([
  "image_blurry",
  "image_too_dark",
  "image_too_bright",
]);
const qualityWarningMessages = [
  ["image_blurry", "scan.live.imageBlurry"],
  ["image_too_dark", "scan.live.tooDark"],
  ["image_too_bright", "scan.live.tooBright"],
  ["tile_detector_partial", "scan.live.lookingKeepVisible"],
] as const;

export function useLiveScanPreview({
  enabled,
  expectedCenter,
  gridSize = 3,
  videoRef,
}: UseLiveScanPreviewOptions): UseLiveScanPreviewResult {
  const { t } = useTranslation();
  const { mutateAsync } = useAnalyzeScanFace();
  const consensusOptions = useMemo(() => temporalOptions(gridSize), [gridSize]);
  const {
    recordAnalysis: recordTemporalAnalysis,
    resetTemporalConsensus,
    temporalConsensus,
  } = useTemporalScanConsensus({
    enabled,
    expectedCenter,
    options: consensusOptions,
  });
  const previousAnalysisRef = useRef<AnalyzeScanFaceResponse | undefined>(
    undefined,
  );
  const stableFrameCountRef = useRef(0);
  const [latestAnalysis, setLatestAnalysis] = useState<
    AnalyzeScanFaceResponse | undefined
  >();
  const [latestCapture, setLatestCapture] = useState<
    CapturedScanImage | undefined
  >();
  const [message, setMessage] = useState(() => t("scan.live.looking"));
  const [shouldAutoFill, setShouldAutoFill] = useState(false);
  const [stableFrameCount, setStableFrameCount] = useState(0);
  const [status, setStatus] = useState<LiveScanPreviewStatus>("idle");

  const acknowledgeAutoFill = useCallback(() => {
    setShouldAutoFill(false);
  }, []);

  const resetAutoFill = useCallback(() => {
    setShouldAutoFill(false);
  }, []);

  const resetTracking = useCallback(() => {
    previousAnalysisRef.current = undefined;
    stableFrameCountRef.current = 0;
    setLatestAnalysis(undefined);
    setLatestCapture(undefined);
    setMessage(t("scan.live.looking"));
    setShouldAutoFill(false);
    setStableFrameCount(0);
    setStatus(enabled ? "searching" : "idle");
    resetTemporalConsensus();
  }, [enabled, resetTemporalConsensus, t]);

  useEffect(() => {
    resetTracking();
  }, [expectedCenter, resetTracking]);

  useEffect(() => {
    if (!enabled) {
      previousAnalysisRef.current = undefined;
      stableFrameCountRef.current = 0;
      setShouldAutoFill(false);
      setStableFrameCount(0);
      setStatus("idle");
      return undefined;
    }

    let cancelled = false;
    let abortController: AbortController | undefined;
    let timeoutId: number;

    function scheduleNextPreview() {
      timeoutId = window.setTimeout(() => {
        void runPreview();
      }, previewIntervalMs);
    }

    async function runPreview() {
      if (cancelled) {
        return;
      }

      if (document.visibilityState === "hidden") {
        scheduleNextPreview();
        return;
      }

      const video = videoRef.current;
      if (video === null) {
        setStatus("searching");
        setMessage(t("scan.live.looking"));
        scheduleNextPreview();
        return;
      }

      const capture = captureScanPreviewImage(video);
      if (capture === undefined) {
        setStatus("searching");
        setMessage(t("scan.live.looking"));
        scheduleNextPreview();
        return;
      }

      abortController = new AbortController();

      try {
        const analysis = await mutateAsync({
          expectedCenter,
          gridSize,
          image: capture.photoDataUrl,
          signal: abortController.signal,
        });

        if (cancelled) {
          return;
        }

        updateTracking(analysis, capture);
      } catch (error) {
        if (!cancelled && !isAbortError(error)) {
          setStatus("error");
          setMessage(
            error instanceof Error ? error.message : t("scan.live.scanFailed"),
          );
        }
      } finally {
        abortController = undefined;
        if (!cancelled) {
          scheduleNextPreview();
        }
      }
    }

    function updateTracking(
      analysis: AnalyzeScanFaceResponse,
      capture: CapturedScanImage,
    ) {
      const previousAnalysis = previousAnalysisRef.current;
      const consensus = recordTemporalAnalysis(analysis, capture.capturedAt);
      const canAutoFillCurrent = isAutoFillReadyAnalysis(
        analysis,
        expectedCenter,
        gridSize,
      );
      const previousCanAutoFill =
        previousAnalysis !== undefined &&
        isAutoFillReadyAnalysis(previousAnalysis, expectedCenter, gridSize);
      const movement =
        previousAnalysis === undefined
          ? Number.POSITIVE_INFINITY
          : averageAnalysisMovement(previousAnalysis, analysis, gridSize);
      const nextStableFrameCount = canAutoFillCurrent
        ? previousCanAutoFill && movement <= maxTileMovement
          ? stableFrameCountRef.current + 1
          : 1
        : 0;
      const nextStatus = liveStatusFromAnalysis(
        analysis,
        nextStableFrameCount,
        expectedCenter,
        gridSize,
      );

      previousAnalysisRef.current = analysis;
      stableFrameCountRef.current = nextStableFrameCount;
      setLatestAnalysis(analysis);
      setLatestCapture(capture);
      setStableFrameCount(nextStableFrameCount);
      setStatus(nextStatus);
      setMessage(liveScanMessage(analysis, nextStatus, t, gridSize));

      if (
        nextStableFrameCount >= stableFrameTarget &&
        isTemporalConsensusReady(consensus)
      ) {
        setShouldAutoFill(true);
        setStatus("holding_steady");
        setMessage(t("scan.live.stableCapturing"));
      } else {
        setShouldAutoFill(false);
      }
    }

    setStatus("searching");
    setMessage(t("scan.live.looking"));
    scheduleNextPreview();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      abortController?.abort();
    };
  }, [
    enabled,
    expectedCenter,
    gridSize,
    mutateAsync,
    recordTemporalAnalysis,
    t,
    videoRef,
  ]);

  return {
    acknowledgeAutoFill,
    latestAnalysis,
    latestCapture,
    message,
    resetAutoFill,
    shouldAutoFill,
    stableFrameCount,
    status,
    temporalConsensus,
  };
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

function liveStatusFromAnalysis(
  analysis: AnalyzeScanFaceResponse,
  nextStableFrameCount: number,
  expectedCenter: ScanFaceSymbol,
  gridSize: 2 | 3,
): LiveScanPreviewStatus {
  if (nextStableFrameCount >= stableFrameTarget) {
    return "holding_steady";
  }

  if (isTrackableAnalysis(analysis, expectedCenter, gridSize)) {
    return "tracking";
  }

  if ((analysis.tileDetections?.length ?? 0) > 0) {
    return "detecting_stickers";
  }

  return "searching";
}

function liveScanMessage(
  analysis: AnalyzeScanFaceResponse,
  status: LiveScanPreviewStatus,
  t: ReturnType<typeof useTranslation>["t"],
  gridSize: 2 | 3,
): string {
  if (status === "holding_steady") {
    return t("scan.live.stableCapturing");
  }

  if (analysis.centerMismatch) {
    return t("scan.live.centerMismatch");
  }

  const warningMessage = qualityWarningMessage(analysis, t);
  if (warningMessage !== undefined) {
    return warningMessage;
  }

  if (status === "detecting_stickers") {
    const targetTileCount = gridSize * gridSize;
    return t("scan.live.detectingStickers", {
      count: Math.min(
        targetTileCount,
        validStickerTileDetections(analysis.tileDetections).length,
      ),
      total: targetTileCount,
    });
  }

  if (status === "tracking") {
    return t("scan.live.gridReady", {
      count: gridSize * gridSize,
      total: gridSize * gridSize,
    });
  }

  return t("scan.live.looking");
}

function qualityWarningMessage(
  analysis: AnalyzeScanFaceResponse,
  t: ReturnType<typeof useTranslation>["t"],
): string | undefined {
  const warnings = new Set([...analysis.qualityWarnings, ...analysis.warnings]);
  const matchedWarning = qualityWarningMessages.find(([warning]) =>
    warnings.has(warning),
  );

  return matchedWarning === undefined ? undefined : t(matchedWarning[1]);
}

function isTrackableAnalysis(
  analysis: AnalyzeScanFaceResponse,
  expectedCenter: ScanFaceSymbol,
  gridSize: 2 | 3,
): boolean {
  return (
    analysis.detectionMode === "tile_detector" &&
    hasCompleteTileDetections(
      analysis,
      expectedCenter,
      temporalOptions(gridSize),
    ) &&
    analysis.faceConfidence >= minFaceConfidence
  );
}

function isAutoFillReadyAnalysis(
  analysis: AnalyzeScanFaceResponse,
  expectedCenter: ScanFaceSymbol,
  gridSize: 2 | 3,
): boolean {
  return (
    isTrackableAnalysis(analysis, expectedCenter, gridSize) &&
    analysis.faceConfidence >= goodFaceConfidence &&
    averageTileConfidence(analysis, gridSize) >= minTileConfidence &&
    !analysis.centerMismatch &&
    !hasCriticalQualityWarning(analysis)
  );
}

function averageAnalysisMovement(
  previousAnalysis: AnalyzeScanFaceResponse,
  nextAnalysis: AnalyzeScanFaceResponse,
  gridSize: 2 | 3,
): number {
  const tileMovement = averageTileMovement(
    previousAnalysis,
    nextAnalysis,
    gridSize,
  );

  if (Number.isFinite(tileMovement)) {
    return tileMovement;
  }

  return Number.POSITIVE_INFINITY;
}

function averageTileMovement(
  previousAnalysis: AnalyzeScanFaceResponse,
  nextAnalysis: AnalyzeScanFaceResponse,
  gridSize: 2 | 3,
): number {
  const previousBoxes = tileBoxesByIndex(previousAnalysis, gridSize);
  const nextBoxes = tileBoxesByIndex(nextAnalysis, gridSize);
  const sharedIndexes = [...previousBoxes.keys()].filter((index) =>
    nextBoxes.has(index),
  );

  if (sharedIndexes.length < gridSize * gridSize) {
    return Number.POSITIVE_INFINITY;
  }

  const total = sharedIndexes.reduce(
    (sum, index) =>
      sum + boxMovement(previousBoxes.get(index)!, nextBoxes.get(index)!),
    0,
  );

  return total / sharedIndexes.length;
}

function tileBoxesByIndex(
  analysis: AnalyzeScanFaceResponse,
  gridSize: 2 | 3,
): Map<number, ScanDetectionBox> {
  const assignedTiles = tileAssignmentFromAnalysis(
    analysis,
    temporalOptions(gridSize),
  );
  return new Map((assignedTiles ?? []).map((tile) => [tile.index, tile.bbox]));
}

function boxMovement(
  previousBox: ScanDetectionBox,
  nextBox: ScanDetectionBox,
): number {
  return Math.hypot(previousBox.x - nextBox.x, previousBox.y - nextBox.y);
}

function hasCriticalQualityWarning(analysis: AnalyzeScanFaceResponse): boolean {
  return [...analysis.qualityWarnings, ...analysis.warnings].some((warning) =>
    criticalQualityWarnings.has(warning),
  );
}

function averageTileConfidence(
  analysis: AnalyzeScanFaceResponse,
  gridSize: 2 | 3,
): number {
  const assignedTiles = tileAssignmentFromAnalysis(
    analysis,
    temporalOptions(gridSize),
  )!;
  return (
    assignedTiles.reduce((sum, tile) => sum + tile.confidence, 0) /
    assignedTiles.length
  );
}

function temporalOptions(gridSize: 2 | 3) {
  return {
    ...defaultTemporalConsensusOptions,
    gridSize,
    minTileDetections: gridSize * gridSize,
  };
}
