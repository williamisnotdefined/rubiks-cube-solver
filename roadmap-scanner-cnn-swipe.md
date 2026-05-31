# Scanner CNN + Embla Swipe Roadmap

This roadmap is a focused autopilot plan for the camera scanner. It combines:

- Embla swipe carousel in the scan modal.
- Editable review across all six cube faces.
- Better capture quality.
- Vision v2 with probabilities and quality scores.
- Session-level scan inference.
- Backend CNN as an evidence source.
- Rust cube constraints, solver validation, and replay verification as the final authority.

Use this roadmap separately from the main product roadmap:

```bash
roadrunner run --roadmap roadmap-scanner-cnn-swipe.md
```

## Product Goal

Build a scanner that accepts a cube state only when it is highly reliable. The scanner should prefer rescan or targeted manual confirmation over accepting a wrong state.

Primary metric:

```text
wrong_accepted_state_rate
```

Success means the app may accept fewer scans automatically, but accepted scans should be much safer.

## Non-Negotiable Rules

- CNN does not decide the final cube state.
- CNN produces visual evidence: face/sticker geometry, color probabilities, and quality signals.
- Rust decides which valid cube state best explains the observations.
- Rust `cube-engine` validation and solver replay verification remain mandatory.
- The frontend captures, reviews, corrects, and submits scan/session data; it must not become the source of solver truth.
- Keep `/scan/analyze-face` for preview and compatibility.
- Keep `/solve-scan` as manual/fallback/debug flow.
- Add session flow without breaking current scan tests.
- Do not commit private raw photos, large datasets, large model checkpoints, or generated private logs.
- Keep styling in Tailwind utility classes only. Do not add page/component CSS files.
- Preserve the square visual language. Do not add `rounded-*` utilities.

## Target Architecture

```text
React/Vite scanner
  -> Embla swipe carousel for F/R/B/L/U/D review
  -> live preview via /scan/analyze-face
  -> final capture for all six faces
  -> /scan/solve-session
  -> Rust API
  -> Python vision service
       -> OpenCV detector
       -> optional CNN/ONNX inference
       -> quality gates
       -> sticker color probabilities
  -> Rust scan inference
       -> face rotations
       -> piece-level candidate search
       -> top-K valid candidates
       -> margin calculation
       -> cube-engine validation
  -> Rust solver
  -> replay verification
  -> accepted | needs_rescan_face | needs_manual_confirmation | invalid_cube_state
```

## Current Important Files

Frontend scanner:

- `apps/web/src/pages/SolvePage/ScanCubeModal.tsx`
- `apps/web/src/pages/SolvePage/ScanCameraFrame.tsx`
- `apps/web/src/pages/SolvePage/ScanFaceColorEditor.tsx`
- `apps/web/src/pages/SolvePage/ScanFaceReviewGrid.tsx`
- `apps/web/src/pages/SolvePage/ScanColorPalette.tsx`
- `apps/web/src/pages/SolvePage/scanState.ts`
- `apps/web/src/pages/SolvePage/scanCapture.ts`
- `apps/web/src/pages/SolvePage/hooks/useCameraStream.ts`
- `apps/web/src/pages/SolvePage/hooks/useLiveScanPreview.ts`

Frontend API:

- `apps/web/src/api/scan/types.ts`
- `apps/web/src/api/scan/analyzeFace/analyzeFace.ts`
- `apps/web/src/api/scan/analyzeFace/useAnalyzeScanFace.ts`
- `apps/web/src/api/solver/solveScan/solveScan.ts`
- `apps/web/src/api/solver/solveScan/useSolveScan.ts`
- `apps/web/src/api/__tests__/solver.test.tsx`

Vision service:

- `vision/app.py`
- `vision/schemas.py`
- `vision/detection.py`
- `vision/color.py`
- `vision/tests/test_detection.py`

Rust API and engine:

- `crates/api/src/routes.rs`
- `crates/api/src/response.rs`
- `crates/api/src/scan_analysis.rs`
- `crates/api/src/solve.rs`
- `crates/api/src/config.rs`
- `crates/api/src/tests.rs`
- `crates/cube-engine/src/cube/facelets.rs`
- `crates/cube-engine/src/cube/facelets/cubie_mapping.rs`
- `crates/cube-engine/src/cube/facelets/layout.rs`
- `crates/cube-engine/src/cube/facelets/colors.rs`

## Phase 0 - Freeze Scanner Baseline

Goal: know the current behavior before changing it.

Tasks:

- Run current scanner-related tests.
- Record current scanner UX behavior.
- Identify known bad cases: glare, blur, low light, red/orange ambiguity, white/yellow ambiguity, face rotation mistakes, and stickerless cubes.
- Do not change behavior in this phase.

Verification:

```bash
npm run vision:test
npm run api:test
npm run test -w @rubiks-cube-solver/web
npm run build
```

Exit criteria:

- Baseline pass/fail state is known.
- Any environment blockers are documented.

## Phase 1 - Add Embla Dependency

Goal: introduce Embla for swipe navigation without changing scanner behavior yet.

Tasks:

- Add `embla-carousel-react` to the web workspace.
- Do not add Embla CSS files.
- Do not add global CSS.
- Keep layout styling in Tailwind utility classes.
- Verify TypeScript can import `useEmblaCarousel`.

Suggested command:

```bash
npm install embla-carousel-react -w @rubiks-cube-solver/web
```

Files expected to change:

- `apps/web/package.json`
- `package-lock.json`

Verification:

```bash
npm run build
npm run lint -w @rubiks-cube-solver/web
```

Exit criteria:

- Embla dependency is installed.
- No scanner UI behavior changed yet.

## Phase 2 - Extract Embla Face Carousel Shell

Goal: create a focused page-specific carousel component for the six scan faces.

New file:

- `apps/web/src/pages/SolvePage/ScanFaceCarousel.tsx`

Component responsibility:

- Own Embla viewport/container markup.
- Render one slide per scan face.
- Render previous/next controls.
- Render face indicators for `F R B L U D`.
- Notify parent when selected face changes.
- Accept active index from parent.
- Accept status per face: `pending`, `draft`, `confirmed`, `invalid`, `needsReview`.

Do not put scan solving logic here.

Suggested props:

```ts
type ScanFaceCarouselProps = {
  currentFaceIndex: number
  faceStatuses: readonly ScanFaceStatus[]
  children: React.ReactNode
  onFaceIndexChange: (index: number) => void
}
```

Implementation notes:

- Use `useEmblaCarousel({ loop: false, dragFree: false, containScroll: 'trimSnaps' })`.
- Use `emblaApi.scrollTo(index)` when parent index changes.
- Subscribe to Embla `select` event and call `onFaceIndexChange`.
- Use a ref/effect cleanup for Embla listeners.
- Keep controls accessible with button labels.
- Use Tailwind classes only.
- Avoid `rounded-*`.

Translation keys to add:

- `scan.carousel.previous`
- `scan.carousel.next`
- `scan.carousel.goToFace`
- `scan.carousel.facePending`
- `scan.carousel.faceDraft`
- `scan.carousel.faceConfirmed`
- `scan.carousel.faceInvalid`
- `scan.carousel.faceNeedsReview`

Files expected to change:

- `apps/web/src/pages/SolvePage/ScanFaceCarousel.tsx`
- `apps/web/src/i18n/locales/en.json`
- `apps/web/src/i18n/locales/pt-BR.json`
- `apps/web/src/i18n/locales/es.json`

Tests:

- Add component coverage through `ScanCubeModal.test.tsx`, or add a nearby component test if extraction becomes substantial.
- Test previous/next buttons.
- Test face indicator navigation.

Verification:

```bash
npm run test -w @rubiks-cube-solver/web
npm run build
npm run lint -w @rubiks-cube-solver/web
```

Exit criteria:

- The component exists and is covered.
- The scanner still works as before when integrated minimally or behind internal markup.

## Phase 3 - Persist Editable Draft State Per Face

Goal: allow users to leave and return to any face without losing photo, stickers, or analysis.

Current problem:

- `ScanCubeModal.tsx` stores current draft in local `stickers`, `photoDataUrl`, and `scanAnalysis`.
- Confirmed faces are stored in `faces`.
- Returning to a previous confirmed face is not currently a first-class flow.

Target state model:

```ts
type ScanFaceDraft = {
  symbol: ScanFaceSymbol
  stickers: ScanSticker[]
  photoDataUrl?: string
  analysis?: AnalyzeScanFaceResponse
  confirmed: boolean
  message?: string
}

type ScanFaceDrafts = Record<ScanFaceSymbol, ScanFaceDraft>
```

Tasks:

- Add helpers in `scanState.ts` to create all six drafts.
- Add helper to derive `ScanFaces` from confirmed drafts.
- Add helper to count confirmed drafts.
- Add helper to derive face status for carousel indicators.
- Keep `ScanFacesPayload` output unchanged for now.
- Update `ScanCubeModal.tsx` to read/write current draft by face symbol.
- Remove assumptions that only the current face has a draft.
- Preserve `knownCenters` using confirmed or captured center RGB where available.

Suggested helper names:

- `createInitialScanFaceDrafts`
- `scanFacesFromDrafts`
- `confirmedDraftCount`
- `scanFaceStatusFromDraft`
- `replaceScanFaceDraftSticker`
- `clearScanFaceDraft`
- `confirmScanFaceDraft`

Tests in `scanState.test.ts`:

- Initial drafts contain six faces.
- Center sticker is fixed for every draft.
- Confirming one draft makes it available to payload derivation.
- Clearing a confirmed draft makes it pending again.
- Manual sticker edits persist in the draft.

Verification:

```bash
npm run test -w @rubiks-cube-solver/web
npm run build
```

Exit criteria:

- Drafts persist independently per face.
- Existing scan payload behavior is preserved.

## Phase 4 - Integrate Embla Swipe Into Scan Modal

Goal: make the scan modal swipable across the six faces.

Tasks:

- Wrap the scan face content in `ScanFaceCarousel`.
- Keep the camera/editor content as the active slide content or render one slide per face if practical.
- Selecting a face should update `currentFaceIndex`.
- Swiping should update `currentFaceIndex`.
- Previous/next buttons should work on desktop and mobile.
- Face indicator buttons should jump directly to a face.
- Auto scan should only run for the active face.
- Switching faces should reset transient live preview state, not stored draft state.
- `Clear photo` should clear only the active face.
- The final solve button remains outside the swipe area so it is always visible.

Important UX rules:

- A confirmed face can be revisited and edited.
- Editing a confirmed face should either keep it confirmed if still valid, or mark it as needing review if invalid.
- Retaking a confirmed face should replace that face only.
- The user must be able to review all six faces before solving.

Button behavior:

- `Confirm face` on an unconfirmed valid face confirms it.
- `Update face` on a confirmed valid face saves changes.
- After confirm/update, advance to the next unconfirmed face if one exists.
- If all faces are confirmed, stay on the current face and show the all-confirmed message.

Translation keys to add:

- `scan.actions.previousFace`
- `scan.actions.nextFace`
- `scan.actions.updateFace`
- `scan.messages.faceUpdated`
- `scan.messages.faceNeedsReview`

Tests in `ScanCubeModal.test.tsx`:

- Confirm face, move next, move previous, captured photo remains visible.
- Confirm face, swipe/go next, return and edit a sticker, edit persists.
- Clear a confirmed face and solve button becomes disabled.
- Indicator buttons jump to selected face.
- Auto scan does not run for inactive faces.
- Existing limit retry flow still works after all six faces are confirmed.

Verification:

```bash
npm run test -w @rubiks-cube-solver/web
npm run build
npm run lint -w @rubiks-cube-solver/web
```

Exit criteria:

- User can swipe/navigate across all faces.
- User can correct a previously confirmed face.
- Existing scan solve flow still works.

## Phase 5 - Improve Capture Quality Before ML

Goal: make final images better before relying on ML.

Tasks:

- Update camera constraints to prefer `facingMode: environment` and high resolution.
- Read `track.getSettings()` and expose camera metadata internally.
- Split preview capture and final capture quality clearly.
- Keep preview low-cost.
- Make final capture higher quality.
- Use `ImageCapture.takePhoto()` when available.
- Keep canvas fallback.
- Return capture metadata from `captureScanImage`.

Expected capture shape:

```ts
type ScanCapture = {
  photoDataUrl: string
  width: number
  height: number
  source: 'image_capture' | 'canvas'
  capturedAt: number
}
```

Files expected to change:

- `apps/web/src/pages/SolvePage/hooks/useCameraStream.ts`
- `apps/web/src/pages/SolvePage/scanCapture.ts`
- `apps/web/src/pages/SolvePage/ScanCubeModal.tsx`
- Related tests.

Verification:

```bash
npm run test -w @rubiks-cube-solver/web
npm run build
npm run lint -w @rubiks-cube-solver/web
```

Exit criteria:

- Preview remains responsive.
- Final capture is higher quality.
- Tests cover fallback behavior.

## Phase 6 - Vision V2 Probabilities And Quality Scores

Goal: stop collapsing each sticker to a single hard color too early.

Tasks in Python:

- Add `estimate_color_probabilities` in `vision/color.py`.
- Keep `classify_rgb` as compatibility wrapper.
- Convert LAB/CIEDE2000 distances to a calibrated probability distribution.
- Use center RGB references when available.
- Use the current face center as an immediate reference for its expected color.
- Return top alternatives and full probabilities.
- Add per-image quality metrics: blur, dark, bright, glare, shadow.
- Add per-sticker quality metrics: variance, glare, shadow, confidence margin.
- Keep `/analyze-face` response backward compatible.

Tasks in schemas:

- Add optional probability and quality fields to sticker responses.
- Add model/debug metadata fields, even before CNN exists.

Tasks in frontend API types:

- Add optional probability and quality fields in `apps/web/src/api/scan/types.ts`.
- Do not require the UI to consume all fields immediately.

Verification:

```bash
npm run vision:test
npm run test -w @rubiks-cube-solver/web
npm run build
```

Exit criteria:

- Current UI still works.
- Responses can carry complete per-sticker probabilities.
- Tests cover ambiguous color cases.

## Phase 7 - Session Endpoint For Six-Face Analysis

Goal: analyze and solve a full scan session instead of finalizing face by face in the browser.

New endpoints:

- Python vision: `POST /analyze-session`
- Rust API: `POST /scan/solve-session`

Rust request shape:

```ts
type ScanSessionRequest = {
  faces: ScanSessionFace[]
  maxDepth: number
  maxNodes?: number
  strategyId?: string
}

type ScanSessionFace = {
  symbol: ScanFaceSymbol
  expectedTop: ScanFaceSymbol
  image: string
  manualOverrides?: Record<number, ScanFaceSymbol>
  clientRotation?: 0 | 90 | 180 | 270
}
```

Rust response statuses:

- `accepted`
- `needs_rescan_face`
- `needs_manual_confirmation`
- `state_ambiguous`
- `orientation_ambiguous`
- `invalid_cube_state`
- `vision_unavailable`
- `api_error`

Tasks:

- Keep `/scan/analyze-face` for live preview.
- Keep `/solve-scan` for manual/fallback.
- Add new request/response structs in `crates/api/src/response.rs` or a new scan contract module.
- Add Rust route in `crates/api/src/routes.rs`.
- Add Python `AnalyzeSessionRequest` and `AnalyzeSessionResponse` schemas.
- Add proxy from Rust API to Python vision service.
- Add new frontend API request/hook under `apps/web/src/api/scan/solveSession`.
- Keep request functions free of React imports.

Verification:

```bash
npm run api:test
npm run vision:test
npm run test -w @rubiks-cube-solver/web
npm run build
```

Exit criteria:

- Session route exists.
- Old scan solve route still works.
- Frontend can call session route in tests.

## Phase 8 - Rust Global Scan Inference

Goal: choose the most likely valid cube state from probabilistic observations.

Location:

- Prefer `crates/cube-engine/src/scan_inference` unless a separate crate becomes necessary.

Input:

```rust
ScanInferenceInput {
    facelet_probabilities: [[f64; 6]; 54],
    quality: ...,
    manual_overrides: ...,
    face_rotation_priors: ...,
}
```

Output:

```rust
ScanInferenceResult {
    status,
    best_candidate,
    runner_up,
    margin,
    rescan_targets,
    manual_targets,
}
```

Algorithm outline:

```text
1. Fix centers to U/R/F/D/L/B.
2. Apply manual overrides as hard constraints.
3. Evaluate face rotations: 0, 90, 180, 270.
4. Score edge candidates by piece identity and orientation.
5. Score corner candidates by piece identity and orientation.
6. Search top-K assignments with beam search or branch-and-bound.
7. Reject duplicate pieces.
8. Reject impossible edge orientation sum.
9. Reject impossible corner orientation sum.
10. Reject invalid parity.
11. Validate with `CubieState::validate`.
12. Render valid candidate to facelets.
13. Compute margin between best and runner-up.
14. Return accepted only when quality and margin pass thresholds.
```

Tests:

- Solved observations return solved candidate.
- One face rotated 90 degrees can be corrected.
- Ambiguous red/orange can be resolved when piece constraints are decisive.
- Invalid parity is rejected.
- Two close valid candidates return `state_ambiguous`.
- Low-quality face returns rescan target.
- Manual override changes the winning candidate.

Verification:

```bash
cargo test -p cube-engine
npm run api:test
```

Exit criteria:

- Rust can accept probabilistic observations and return top candidate decisions.
- Invalid or ambiguous states do not produce accepted solutions.

## Phase 9 - Wire Session Flow Into Swipe Modal

Goal: the carousel scan modal submits the full session and handles backend-directed correction.

Tasks:

- Store final image and overrides per face in drafts.
- Submit all six images to `/scan/solve-session`.
- Keep `/solve-scan` fallback when session route is unavailable or user chooses manual fallback.
- If response is `accepted`, close modal and show solution.
- If response is `needs_rescan_face`, navigate carousel to that face.
- If response is `needs_manual_confirmation`, navigate to the first target face and highlight target stickers.
- If response is `orientation_ambiguous`, ask user to rotate/review the face.
- If response is `invalid_cube_state`, keep the modal open and show actionable message.

UI additions:

- Face status indicator for backend review targets.
- Sticker highlight for backend manual targets.
- Optional rotate face controls: left/right 90 degrees.

Tests:

- Accepted session closes modal.
- Rescan target navigates to requested face.
- Manual confirmation target highlights requested stickers.
- Session unavailable falls back to manual scan solve path.

Verification:

```bash
npm run test -w @rubiks-cube-solver/web
npm run build
npm run lint -w @rubiks-cube-solver/web
npm run api:test
```

Exit criteria:

- The modal is ready for backend-directed rescan and correction.

## Phase 10 - Vision ML Workspace And Dataset Format

Goal: create a separate vision ML area without mixing with solver ML.

New area:

```text
vision_ml/
  README.md
  requirements.txt
  datasets/
  annotations/
  train_segmentation.py
  export_onnx.py
  evaluate.py
```

Dataset schema should include:

- Session id.
- Face symbol.
- Expected top symbol.
- Original image path.
- Face quad.
- Sticker polygons or masks.
- Sticker color labels.
- Quality labels: blur, glare, occlusion, shadow.
- Final corrected cube state when available.
- Consent flag for real images.
- Dataset split: train, validation, test.

Rules:

- Do not commit private raw user images.
- Do not commit large datasets.
- Commit only tiny synthetic or anonymized fixtures if needed for tests.
- Keep a frozen validation/test split for model release decisions.

Verification:

```bash
python -m pytest vision
python -m pytest vision_ml
```

Exit criteria:

- Vision ML data format is documented and testable.

## Phase 11 - Backend CNN/ONNX Inference

Goal: add CNN as an optional backend evidence source.

New files:

- `vision/inference.py`
- `vision/session.py`
- `vision/quality.py`
- `vision/features.py`
- `vision/models/README.md`

Requirements:

- The service must run without a model file.
- If model is missing, return `model.available = false` and use OpenCV only.
- If model is present, load ONNX once at startup or lazy-load safely.
- Return model version and model hash.
- CNN output should be evidence, not final state.

CNN outputs:

- Face box or quad.
- Sticker centers or masks.
- Color logits/probabilities.
- Quality logits.
- Optional glare/occlusion masks.

Ensemble rules:

- OpenCV and CNN agree: raise confidence.
- OpenCV good and CNN unavailable: allow only if Rust candidate margin is high.
- CNN good and OpenCV weak: allow only if quality gates and Rust margin pass.
- OpenCV and CNN strongly disagree: return rescan/manual confirmation.
- `guide_fallback` must not be final authority.

Verification:

```bash
npm run vision:test
```

Exit criteria:

- Vision service works with and without a CNN model.
- Responses include model availability/version metadata.

## Phase 12 - Train, Export, And Evaluate CNN

Goal: make model development reproducible.

Training scripts:

- `vision_ml/train_segmentation.py`
- `vision_ml/export_onnx.py`
- `vision_ml/evaluate.py`

Minimum metrics:

- `face_detection_success_rate`
- `face_iou`
- `sticker_center_error_px`
- `sticker_mask_iou`
- `sticker_color_top1_accuracy`
- `sticker_color_top2_accuracy`
- `expected_calibration_error`
- `glare_f1`
- `occlusion_f1`
- `session_final_state_accuracy`
- `wrong_accepted_state_rate`
- `rescan_rate`
- `manual_confirmation_rate`

Release rule:

```text
A new model cannot ship if it increases wrong_accepted_state_rate on the frozen validation set.
```

Verification:

```bash
python -m pytest vision_ml
python -m vision_ml.evaluate --dataset vision_ml/datasets/fixtures --model vision/models/current.onnx
```

Exit criteria:

- CNN training/export/evaluation path is deterministic enough for repeated local runs.

## Phase 13 - Commercial Quality Gate

Goal: make acceptance conservative and measurable.

Accept only when:

- Face quality passes.
- Sticker quality passes.
- Top color probability passes.
- Top1/top2 margin passes.
- Best cube candidate margin passes.
- Candidate is valid according to cube constraints.
- Solver returns replay-verified solution.
- OpenCV/CNN disagreement is below threshold or CNN is unavailable with a conservative fallback path.

Return rescan when:

- Face not found.
- Face too small.
- Blur is high.
- Glare is high.
- Occlusion is likely.
- Center mismatch is likely.
- OpenCV/CNN disagree strongly.
- Several stickers are ambiguous on the same face.

Return manual confirmation when:

- One to three stickers are ambiguous.
- Image quality is acceptable.
- Top candidates differ in a few stickers.
- Rescan is unlikely to add much information.

Verification:

```bash
npm run vision:test
npm run api:test
cargo test -p cube-engine
npm run test -w @rubiks-cube-solver/web
npm run build
```

Exit criteria:

- Scanner prefers rescan/manual confirmation over wrong accepted states.
- Metrics are available for release decisions.

## Phase 14 - Optional Browser CNN Preview

Goal: improve UX latency only after backend CNN is stable.

Allowed use:

- Local preview overlays.
- Faster user feedback.
- Reduced preview calls.

Not allowed:

- Browser CNN as final authority.
- Browser CNN replacing Rust validation.
- Browser CNN replacing backend session solve.

Candidate libraries:

- ONNX Runtime Web.
- TensorFlow.js.

Exit criteria:

- Browser model improves preview UX without changing final authority.

## Autopilot Chunking Rules

- One phase at a time.
- Do not combine dependency addition, large state refactor, API contract changes, and CNN work in one chunk.
- Add or update tests in the same chunk as behavior changes.
- Keep old endpoints working until the new session flow is proven.
- Prefer small page-specific components over shared abstractions.
- Report verification commands and blockers after each phase.

## Standard Verification Menu

Frontend-only changes:

```bash
npm run test -w @rubiks-cube-solver/web
npm run build
npm run lint -w @rubiks-cube-solver/web
```

Vision changes:

```bash
npm run vision:test
```

Rust API changes:

```bash
npm run api:test
```

Cube-engine changes:

```bash
cargo test -p cube-engine
```

Cross-boundary scanner changes:

```bash
npm run vision:test
npm run api:test
cargo test -p cube-engine
npm run test -w @rubiks-cube-solver/web
npm run build
```

Release-level gate when practical:

```bash
npm run product:gate
```
