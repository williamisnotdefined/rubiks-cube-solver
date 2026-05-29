use crate::cube::{Algorithm, Move};
use crate::solver::SolverStrategy;

use super::types::QualityTableStatus;

pub(super) fn strategy_label(strategy: SolverStrategy) -> &'static str {
    strategy.id()
}

pub(super) fn table_status_for_success(strategy: SolverStrategy) -> QualityTableStatus {
    match strategy {
        SolverStrategy::GeneratedTwoPhase
        | SolverStrategy::GeneratedTwoPhaseQuality
        | SolverStrategy::GeneratedTwoPhaseMultiprobe
        | SolverStrategy::OptimalBoundedCornerPdb
        | SolverStrategy::OptimalBoundedPdb16
        | SolverStrategy::ShortSolutionPortfolio => QualityTableStatus::Available,
        SolverStrategy::BoundedIdaStar
        | SolverStrategy::TwoPhaseBaseline
        | SolverStrategy::OptimalIdaStarOrientationPdb => QualityTableStatus::NotRequired,
    }
}

pub(super) fn scramble_label(scramble: &str) -> &str {
    if scramble.is_empty() {
        "-"
    } else {
        scramble
    }
}

pub(super) fn max_nodes_label(max_nodes: Option<usize>) -> String {
    max_nodes.map_or_else(|| "unlimited".to_owned(), |max_nodes| max_nodes.to_string())
}

pub(super) fn optional_str_label(value: Option<&str>) -> &str {
    value.unwrap_or("-")
}

pub(super) fn optional_usize_label(value: Option<usize>) -> String {
    value.map_or_else(|| "-".to_owned(), |value| value.to_string())
}

pub(super) fn replay_verified_label(value: Option<bool>) -> &'static str {
    match value {
        Some(true) => "true",
        Some(false) => "false",
        None => "-",
    }
}

pub(super) fn moves_label(moves: &[Move]) -> String {
    if moves.is_empty() {
        "-".to_owned()
    } else {
        Algorithm::new(moves.to_vec()).to_string()
    }
}
