use std::net::SocketAddr;

use rubiks_cube_solver_api::{api_router, api_router_with_web_dist, ApiConfig, ApiState};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = ApiConfig::from_env();
    let addr = config.addr.parse::<SocketAddr>()?;
    let state = ApiState::load_generated_solver_with_vision_url(
        &config.pruning_table_dir,
        config.vision_url.clone(),
    )
    .map_err(|error| {
        format!(
            "failed to load generated two-phase solver from {}: {error}",
            config.pruning_table_dir.display()
        )
    })?;
    let web_index_file = config.web_dist_dir.join("index.html");
    let app = if web_index_file.is_file() {
        api_router_with_web_dist(state, config.web_dist_dir.clone())
    } else {
        eprintln!(
            "web dist not found at {}; serving API routes only",
            config.web_dist_dir.display()
        );
        api_router(state)
    };
    let listener = tokio::net::TcpListener::bind(addr).await?;

    println!(
        "rubiks-cube-solver-api listening on http://{} with pruning tables {}",
        addr,
        config.pruning_table_dir.display()
    );
    axum::serve(listener, app).await?;

    Ok(())
}
