use std::path::PathBuf;

pub const DEFAULT_API_ADDR: &str = "127.0.0.1:8787";
pub const DEFAULT_PRUNING_TABLE_DIR: &str = "crates/cube-engine/pruning-tables";
pub const DEFAULT_VISION_URL: &str = "http://127.0.0.1:8790";
pub const DEFAULT_WEB_DIST_DIR: &str = "apps/web/dist";
pub const CORS_ALLOWED_ORIGINS_ENV: &str = "RUBIKS_CORS_ALLOWED_ORIGINS";
pub const DEFAULT_SOLVER_MAX_CONCURRENCY: usize = 2;
pub const DEFAULT_CORS_ALLOWED_ORIGINS: &[&str] = &[
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "http://127.0.0.1:4173",
    "http://localhost:4173",
];
pub const MAX_API_DEPTH: usize = 30;
pub const CUBE3_MAX_API_DEPTH: usize = 23;
pub const CUBE2_MAX_API_DEPTH: usize = 11;
pub const DEFAULT_API_NODES: usize = 10_000_000;
pub const MAX_API_NODES: usize = 25_000_000;
pub const MAX_NOTATION_BYTES: usize = 4096;
pub const MAX_SCAN_IMAGE_BYTES: usize = 1_000_000;
pub const MAX_JSON_BODY_BYTES: usize = 1_500_000;
pub const MAX_SCAN_SESSION_BODY_BYTES: usize = 14_000_000;

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ApiConfig {
    pub addr: String,
    pub pruning_table_dir: PathBuf,
    pub solver_max_concurrency: usize,
    pub vision_url: String,
    pub web_dist_dir: PathBuf,
}

impl ApiConfig {
    pub fn from_env() -> Self {
        let addr = std::env::var("RUBIKS_API_ADDR").unwrap_or_else(|_| DEFAULT_API_ADDR.to_owned());
        let pruning_table_dir = std::env::var("RUBIKS_PRUNING_TABLE_DIR")
            .map(PathBuf::from)
            .unwrap_or_else(|_| PathBuf::from(DEFAULT_PRUNING_TABLE_DIR));
        let vision_url =
            std::env::var("RUBIKS_VISION_URL").unwrap_or_else(|_| DEFAULT_VISION_URL.to_owned());
        let solver_max_concurrency = std::env::var("RUBIKS_SOLVER_MAX_CONCURRENCY")
            .ok()
            .and_then(|value| value.parse::<usize>().ok())
            .filter(|value| *value > 0)
            .unwrap_or(DEFAULT_SOLVER_MAX_CONCURRENCY);
        let web_dist_dir = std::env::var("RUBIKS_WEB_DIST_DIR")
            .map(PathBuf::from)
            .unwrap_or_else(|_| PathBuf::from(DEFAULT_WEB_DIST_DIR));

        Self {
            addr,
            pruning_table_dir,
            solver_max_concurrency,
            vision_url,
            web_dist_dir,
        }
    }
}
