use std::net::SocketAddr;

use rubiks_cube_solver_api::{api_router, ApiConfig, ApiState};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = ApiConfig::from_env();
    let addr = config.addr.parse::<SocketAddr>()?;
    let state = ApiState::load_generated_solver(&config.pruning_table_dir).map_err(|error| {
        format!(
            "failed to load generated two-phase solver from {}: {error}",
            config.pruning_table_dir.display()
        )
    })?;
    let app = api_router(state);
    let listener = tokio::net::TcpListener::bind(addr).await?;

    println!(
        "rubiks-cube-solver-api listening on http://{} with pruning tables {}",
        addr,
        config.pruning_table_dir.display()
    );
    axum::serve(listener, app).await?;

    Ok(())
}
