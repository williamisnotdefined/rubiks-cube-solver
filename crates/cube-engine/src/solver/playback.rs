use crate::cube::{Algorithm, Cube, FaceletString};

use super::{FaceletPlaybackError, FaceletPlaybackResult};

/// Replay notation from a user-facing facelet string and render every engine state.
pub fn playback_facelet_solution(
    start_facelets: &str,
    moves: &str,
) -> Result<FaceletPlaybackResult, FaceletPlaybackError> {
    let facelets = FaceletString::parse(start_facelets)?;
    let state = facelets.to_cubie_state()?;
    let mut cube = Cube::try_from_state(state)?;
    let algorithm = Algorithm::parse(moves)?;
    let mut states = Vec::with_capacity(algorithm.len() + 1);

    states.push(FaceletString::from_cube(&cube).to_string());

    for move_ in algorithm.moves() {
        cube.apply_move(*move_);
        states.push(FaceletString::from_cube(&cube).to_string());
    }

    Ok(FaceletPlaybackResult::new(states, cube.is_solved()))
}
