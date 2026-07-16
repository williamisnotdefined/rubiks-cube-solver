use std::path::{Component, Path as FsPath, PathBuf};
use std::time::Duration;

use axum::body::Body;
use axum::extract::{DefaultBodyLimit, OriginalUri, Path, State};
use axum::http::{
    header::CACHE_CONTROL, header::CONTENT_TYPE, HeaderName, HeaderValue, Method, Request,
    StatusCode,
};
use axum::middleware::{self, Next};
use axum::response::{IntoResponse, Redirect, Response};
use axum::routing::{any, get, post};
use axum::{Json, Router};
use cube_engine::{PuzzleId, SolverStrategy};
use tokio::task;
use tower_http::cors::{AllowOrigin, CorsLayer};
use tower_http::services::{ServeDir, ServeFile};

use crate::config::{
    CORS_ALLOWED_ORIGINS_ENV, DEFAULT_CORS_ALLOWED_ORIGINS, MAX_JSON_BODY_BYTES,
    MAX_SCAN_SESSION_BODY_BYTES,
};
use crate::puzzle::{
    list_puzzles_response, puzzle_response_by_slug, puzzle_solve_overloaded_response,
    puzzle_solve_worker_failed_response, puzzle_strategy_responses_by_slug, solve_puzzle_request,
    validate_puzzle_solve_request_before_capacity,
};
use crate::response::{
    solver_overloaded_response_from_parts, solver_worker_failed_response_from_parts,
    AnalyzeScanFaceRequest, AnalyzeScanFaceResponse, HealthResponse, LivezResponse,
    PuzzleSolveRequest, PuzzleSolveResponse, ReadyzResponse, ScanSessionRequest,
    ScanSessionResponse, SolveNotationRequest, SolveResponse, SolveScanRequest, StrategyResponse,
};
use crate::scan_analysis::{
    analyze_scan_face_request, solve_scan_session_request_for_puzzle,
    validate_scan_session_request_before_capacity,
};
use crate::solve::{
    prepare_solve_notation_request, prepare_solve_scan_request, solve_prepared_request,
};
use crate::state::ApiState;

const HEALTH_VISION_TIMEOUT: Duration = Duration::from_millis(250);
const CONTENT_SECURITY_POLICY: &str = "default-src 'self'; script-src 'self' 'nonce-speedcube-jsonld' 'wasm-unsafe-eval' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://yt3.googleusercontent.com https://avatars.worldcubeassociation.org; connect-src 'self' http://127.0.0.1:* http://localhost:* https://cloudflareinsights.com; media-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'";
const VERSIONED_ASSET_CACHE_CONTROL: &str = "public, max-age=31536000, immutable";

#[derive(serde::Deserialize)]
struct VisionHealthResponse {
    ok: bool,
    #[serde(rename = "tileDetectorAvailable", default)]
    tile_detector_available: bool,
    #[serde(rename = "tileDetectorReason", default)]
    tile_detector_reason: Option<String>,
}

pub fn api_router(state: ApiState) -> Router {
    apply_http_layers(api_routes()).with_state(state)
}

pub fn api_router_with_web_dist(state: ApiState, web_dist_dir: PathBuf) -> Router {
    let assets_dir = web_dist_dir.join("assets");
    let not_found_service = ServeFile::new(web_dist_dir.join("404.html"));
    let mut router = api_routes()
        .route("/api/{*path}", any(|| async { StatusCode::NOT_FOUND }))
        .nest_service("/assets", ServeDir::new(assets_dir));

    for &(source, destination) in FIXED_WEB_REDIRECTS {
        router = add_permanent_redirect(router, source, destination.to_owned());
    }

    for &locale in LOCALE_PREFIXES {
        let root = format!("/{locale}");
        let solve = format!("/{locale}/solve/");
        router = add_permanent_redirect(router, &root, solve.clone());
        router = add_permanent_redirect(router, &format!("{root}/"), solve);

        let notations = format!("/{locale}/notations");
        let notation_guide = if locale == "en" {
            "/notations/3x3/".to_owned()
        } else {
            format!("/{locale}/notations/3x3/")
        };
        router = add_permanent_redirect(router, &notations, notation_guide.clone());
        router = add_permanent_redirect(router, &format!("{notations}/"), notation_guide);
    }

    for destination in default_locale_static_paths(&web_dist_dir) {
        let source = format!("/en{destination}");
        router = add_permanent_redirect(router, &source, destination.clone());
        if source.ends_with('/') {
            router = add_permanent_redirect(router, source.trim_end_matches('/'), destination);
        }
    }

    let router =
        router.fallback_service(ServeDir::new(web_dist_dir).not_found_service(not_found_service));

    apply_http_layers(router).with_state(state)
}

const FIXED_WEB_REDIRECTS: &[(&str, &str)] = &[
    ("/", "/solve/"),
    ("/api/wca-data", "/api/wca-data/v1/docs"),
    ("/api/wca-data/", "/api/wca-data/v1/docs"),
    ("/notations", "/notations/3x3/"),
    ("/notations/", "/notations/3x3/"),
];
const LOCALE_PREFIXES: &[&str] = &["en", "de", "es", "fr", "it", "ja", "pt-BR", "ru", "zh"];
const PREFIXED_STATIC_LOCALES: &[&str] = &["de", "es", "fr", "it", "ja", "pt-BR", "ru", "zh"];

fn add_permanent_redirect(
    router: Router<ApiState>,
    source: &str,
    destination: String,
) -> Router<ApiState> {
    router.route(
        source,
        get(move |OriginalUri(uri): OriginalUri| {
            let destination = destination.clone();
            async move { permanent_redirect_with_query(&destination, &uri) }
        }),
    )
}

fn permanent_redirect_with_query(destination: &str, original_uri: &axum::http::Uri) -> Redirect {
    match original_uri.query() {
        Some(query) => Redirect::permanent(&format!("{destination}?{query}")),
        None => Redirect::permanent(destination),
    }
}

fn default_locale_static_paths(web_dist_dir: &FsPath) -> Vec<String> {
    let mut paths = Vec::new();
    collect_default_locale_static_paths(web_dist_dir, web_dist_dir, &mut paths);
    paths
}

fn collect_default_locale_static_paths(root: &FsPath, directory: &FsPath, paths: &mut Vec<String>) {
    let Ok(entries) = std::fs::read_dir(directory) else {
        return;
    };

    for entry in entries.flatten() {
        let Ok(file_type) = entry.file_type() else {
            continue;
        };
        if file_type.is_dir() {
            collect_default_locale_static_paths(root, &entry.path(), paths);
            continue;
        }
        if entry.file_name() != "index.html" || directory == root {
            continue;
        }

        let Ok(relative) = directory.strip_prefix(root) else {
            continue;
        };
        if !relative
            .components()
            .all(|component| matches!(component, Component::Normal(_)))
        {
            continue;
        }
        let Some(relative) = relative.to_str() else {
            continue;
        };
        let path = format!("/{}/", relative.replace(std::path::MAIN_SEPARATOR, "/"));
        if is_safe_default_locale_path(&path) {
            paths.push(path);
        }
    }
}

fn is_safe_default_locale_path(path: &str) -> bool {
    path.starts_with('/')
        && !path.starts_with("//")
        && path.ends_with('/')
        && !path.contains(['\\', '?', '#', '{', '}'])
        && !PREFIXED_STATIC_LOCALES.iter().any(|locale| {
            let prefix = format!("/{locale}/");
            path.starts_with(&prefix)
        })
}

fn api_routes() -> Router<ApiState> {
    Router::new()
        .route("/health", get(health))
        .route("/livez", get(livez))
        .route("/readyz", get(readyz))
        .route("/puzzles", get(puzzles))
        .route("/puzzles/{puzzle_slug}", get(puzzle_detail))
        .route("/puzzles/{puzzle_slug}/strategies", get(puzzle_strategies))
        .route("/puzzles/{puzzle_slug}/solve", post(solve_puzzle))
        .route("/strategies", get(strategies))
        .route("/scan/analyze-face", post(analyze_scan_face))
        .route(
            "/scan/solve-session",
            post(solve_scan_session).layer(DefaultBodyLimit::max(MAX_SCAN_SESSION_BODY_BYTES)),
        )
        .route(
            "/puzzles/{puzzle_slug}/scan/solve-session",
            post(solve_puzzle_scan_session)
                .layer(DefaultBodyLimit::max(MAX_SCAN_SESSION_BODY_BYTES)),
        )
        .route("/solve-notation", post(solve_notation))
        .route("/solve-scan", post(solve_scan))
}

fn apply_http_layers(router: Router<ApiState>) -> Router<ApiState> {
    router
        .layer(DefaultBodyLimit::max(MAX_JSON_BODY_BYTES))
        .layer(middleware::from_fn(security_headers))
        .layer(cors_layer())
}

fn cors_layer() -> CorsLayer {
    let allowed_origins = allowed_web_origins_from_env();

    CorsLayer::new()
        .allow_methods([Method::GET, Method::POST])
        .allow_headers([CONTENT_TYPE])
        .allow_origin(AllowOrigin::predicate(move |origin, _request_head| {
            allowed_web_origin(origin, &allowed_origins)
        }))
}

pub(crate) fn allowed_web_origins(value: Option<&str>) -> Vec<String> {
    value.map_or_else(
        || {
            DEFAULT_CORS_ALLOWED_ORIGINS
                .iter()
                .map(ToString::to_string)
                .collect()
        },
        |origins| {
            origins
                .split(',')
                .map(str::trim)
                .filter(|origin| !origin.is_empty())
                .map(ToOwned::to_owned)
                .collect()
        },
    )
}

fn allowed_web_origins_from_env() -> Vec<String> {
    allowed_web_origins(std::env::var(CORS_ALLOWED_ORIGINS_ENV).ok().as_deref())
}

fn allowed_web_origin(origin: &HeaderValue, allowed_origins: &[String]) -> bool {
    origin
        .to_str()
        .is_ok_and(|origin| allowed_origins.iter().any(|allowed| allowed == origin))
}

async fn security_headers(request: Request<Body>, next: Next) -> Response {
    let cache_versioned_asset = request.uri().path().starts_with("/assets/");
    let mut response = next.run(request).await;
    let should_cache_versioned_asset = cache_versioned_asset && response.status().is_success();
    let headers = response.headers_mut();
    headers.insert(
        HeaderName::from_static("content-security-policy"),
        HeaderValue::from_static(CONTENT_SECURITY_POLICY),
    );
    headers.insert(
        HeaderName::from_static("permissions-policy"),
        HeaderValue::from_static("camera=(self), microphone=(), geolocation=()"),
    );
    headers.insert(
        HeaderName::from_static("referrer-policy"),
        HeaderValue::from_static("no-referrer"),
    );
    headers.insert(
        HeaderName::from_static("x-content-type-options"),
        HeaderValue::from_static("nosniff"),
    );
    if should_cache_versioned_asset {
        headers.insert(
            CACHE_CONTROL,
            HeaderValue::from_static(VERSIONED_ASSET_CACHE_CONTROL),
        );
    }

    response
}

async fn livez() -> Json<LivezResponse> {
    Json(LivezResponse { ok: true })
}

async fn readyz(State(state): State<ApiState>) -> (StatusCode, Json<ReadyzResponse>) {
    let generated_two_phase_ready = state.generated_solver_ready();
    let status = if generated_two_phase_ready {
        StatusCode::OK
    } else {
        StatusCode::SERVICE_UNAVAILABLE
    };

    (
        status,
        Json(ReadyzResponse {
            ok: generated_two_phase_ready,
            generated_two_phase_ready,
        }),
    )
}

async fn health(State(state): State<ApiState>) -> Json<HealthResponse> {
    let vision_health = request_vision_health(&state).await;
    let vision_ok = vision_health.as_ref().is_some_and(|health| health.ok);
    let vision_tile_detector_available = vision_health
        .as_ref()
        .is_some_and(|health| health.tile_detector_available);

    Json(HealthResponse {
        ok: true,
        generated_two_phase_ready: state.generated_solver_ready(),
        vision_ok,
        vision_tile_detector_available,
        vision_tile_detector_reason: vision_health.and_then(|health| health.tile_detector_reason),
    })
}

async fn request_vision_health(state: &ApiState) -> Option<VisionHealthResponse> {
    let url = format!("{}/health", state.vision_url.trim_end_matches('/'));
    reqwest::Client::new()
        .get(url)
        .timeout(HEALTH_VISION_TIMEOUT)
        .send()
        .await
        .ok()?
        .json::<VisionHealthResponse>()
        .await
        .ok()
}

async fn strategies() -> Json<Vec<StrategyResponse>> {
    Json(
        SolverStrategy::ALL
            .into_iter()
            .map(|strategy| {
                let metadata = strategy.metadata();
                StrategyResponse {
                    id: metadata.id,
                    label: metadata.label,
                    solver_mode: metadata.solver_mode,
                    status_text: metadata.status_text,
                }
            })
            .collect(),
    )
}

async fn puzzles() -> Json<Vec<crate::PuzzleResponse>> {
    Json(list_puzzles_response())
}

async fn puzzle_detail(Path(puzzle_slug): Path<String>) -> Response {
    match puzzle_response_by_slug(&puzzle_slug) {
        Ok(response) => Json(response).into_response(),
        Err(response) => (StatusCode::NOT_FOUND, Json(response)).into_response(),
    }
}

async fn puzzle_strategies(Path(puzzle_slug): Path<String>) -> Response {
    match puzzle_strategy_responses_by_slug(&puzzle_slug) {
        Ok(response) => Json(response).into_response(),
        Err(response) => (StatusCode::NOT_FOUND, Json(response)).into_response(),
    }
}

async fn solve_puzzle(
    State(state): State<ApiState>,
    Path(puzzle_slug): Path<String>,
    Json(mut request): Json<PuzzleSolveRequest>,
) -> (StatusCode, Json<PuzzleSolveResponse>) {
    if let Err(response) = validate_puzzle_solve_request_before_capacity(&puzzle_slug, &mut request)
    {
        let (status, response) = *response;
        return (status, Json(response));
    }

    let Some(permit) = state.try_acquire_solver_permit() else {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(puzzle_solve_overloaded_response(&puzzle_slug, &request)),
        );
    };
    let worker_failed_response = puzzle_solve_worker_failed_response(&puzzle_slug, &request);

    let result = task::spawn_blocking(move || {
        let _permit = permit;
        solve_puzzle_request(&state, &puzzle_slug, request)
    })
    .await;

    let (status, response) = match result {
        Ok(response) => response,
        Err(_error) => (StatusCode::INTERNAL_SERVER_ERROR, worker_failed_response),
    };

    (status, Json(response))
}

async fn solve_notation(
    State(state): State<ApiState>,
    Json(request): Json<SolveNotationRequest>,
) -> (StatusCode, Json<SolveResponse>) {
    let prepared = match prepare_solve_notation_request(request) {
        Ok(prepared) => prepared,
        Err(response) => return *response,
    };
    solve_prepared_http_request(state, prepared).await
}

async fn solve_scan(
    State(state): State<ApiState>,
    Json(request): Json<SolveScanRequest>,
) -> (StatusCode, Json<SolveResponse>) {
    let prepared = match prepare_solve_scan_request(request) {
        Ok(prepared) => prepared,
        Err(response) => return *response,
    };
    solve_prepared_http_request(state, prepared).await
}

async fn solve_prepared_http_request(
    state: ApiState,
    prepared: crate::solve::PreparedSolveRequest,
) -> (StatusCode, Json<SolveResponse>) {
    let strategy_id = prepared.strategy.id().to_owned();
    let max_depth = prepared.max_depth;
    let max_nodes = prepared.max_nodes;
    let Some(permit) = state.try_acquire_solver_permit() else {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(solver_overloaded_response_from_parts(
                &strategy_id,
                max_depth,
                max_nodes,
            )),
        );
    };

    match task::spawn_blocking(move || {
        let _permit = permit;
        solve_prepared_request(&state, prepared)
    })
    .await
    {
        Ok(response) => response,
        Err(_error) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(solver_worker_failed_response_from_parts(
                &strategy_id,
                max_depth,
                max_nodes,
            )),
        ),
    }
}

async fn analyze_scan_face(
    State(state): State<ApiState>,
    Json(request): Json<AnalyzeScanFaceRequest>,
) -> (StatusCode, Json<AnalyzeScanFaceResponse>) {
    analyze_scan_face_request(&state, request).await
}

async fn solve_scan_session(
    State(state): State<ApiState>,
    Json(request): Json<ScanSessionRequest>,
) -> (StatusCode, Json<ScanSessionResponse>) {
    solve_scan_session_http_request(state, PuzzleId::Cube3x3x3, request).await
}

async fn solve_puzzle_scan_session(
    State(state): State<ApiState>,
    Path(puzzle_slug): Path<String>,
    Json(request): Json<ScanSessionRequest>,
) -> (StatusCode, Json<ScanSessionResponse>) {
    let Some(puzzle_id) = PuzzleId::from_slug(&puzzle_slug) else {
        return (
            StatusCode::NOT_FOUND,
            Json(ScanSessionResponse {
                ok: false,
                status: "unknown_puzzle".to_owned(),
                message: Some(format!("unknown puzzle slug: {puzzle_slug}")),
                timings: None,
                scan: None,
                solve: None,
                inference: None,
                rescan_faces: Vec::new(),
                manual_targets: Vec::new(),
                invalid_corners: Vec::new(),
            }),
        );
    };

    solve_scan_session_http_request(state, puzzle_id, request).await
}

async fn solve_scan_session_http_request(
    state: ApiState,
    puzzle_id: PuzzleId,
    request: ScanSessionRequest,
) -> (StatusCode, Json<ScanSessionResponse>) {
    if let Some(response) = validate_scan_session_request_before_capacity(puzzle_id, &request) {
        return *response;
    }

    let Some(permit) = state.try_acquire_solver_permit() else {
        return scan_session_solver_error_response(
            StatusCode::SERVICE_UNAVAILABLE,
            "solver concurrency limit reached; retry the request later".to_owned(),
        );
    };

    match task::spawn_blocking(move || {
        let _permit = permit;
        solve_scan_session_request_for_puzzle(&state, puzzle_id, request)
    })
    .await
    {
        Ok(response) => response,
        Err(_error) => scan_session_solver_error_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            "solver worker failed before returning a response".to_owned(),
        ),
    }
}

fn scan_session_solver_error_response(
    status: StatusCode,
    message: String,
) -> (StatusCode, Json<ScanSessionResponse>) {
    (
        status,
        Json(ScanSessionResponse {
            ok: false,
            status: "api_error".to_owned(),
            message: Some(message),
            timings: None,
            scan: None,
            solve: None,
            inference: None,
            rescan_faces: Vec::new(),
            manual_targets: Vec::new(),
            invalid_corners: Vec::new(),
        }),
    )
}
