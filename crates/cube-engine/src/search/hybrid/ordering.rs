use std::cmp::Ordering;

use super::types::{
    HybridMoveOrderingMetrics, HybridSearchResult, HybridValuePrediction, HybridValueSource,
};
use crate::cube::{Cube, Move};
use crate::search::heuristics::ZeroHeuristic;
use crate::search::ida_star::solve_ida_star_bounded_with_ordered_moves;
use crate::search::solution::SearchBudget;

pub(crate) fn solve_hybrid_move_ordering(
    start: &Cube,
    budget: SearchBudget,
    value_source: &HybridValueSource,
) -> HybridSearchResult {
    let mut metrics = HybridMoveOrderingMetrics::default();
    let heuristic = ZeroHeuristic;
    let outcome = solve_ida_star_bounded_with_ordered_moves(
        start,
        budget,
        &heuristic,
        |cube, candidate_moves| {
            order_moves_by_value_source(cube, candidate_moves, value_source, &mut metrics);
        },
    );

    HybridSearchResult { outcome, metrics }
}

fn order_moves_by_value_source(
    cube: &Cube,
    candidate_moves: &mut Vec<Move>,
    value_source: &HybridValueSource,
    metrics: &mut HybridMoveOrderingMetrics,
) {
    let mut scored_moves = candidate_moves
        .iter()
        .copied()
        .enumerate()
        .map(|(original_index, move_)| {
            let mut child = cube.clone();
            child.apply_move(move_);
            let score = match value_source.predicted_value(child.state()) {
                HybridValuePrediction::Scored { value, model_eval } => {
                    metrics.scored_move_lookups += 1;
                    if model_eval {
                        metrics.model_score_evals += 1;
                    }
                    Some(value)
                }
                HybridValuePrediction::Missing => {
                    metrics.missing_score_lookups += 1;
                    None
                }
            };

            ScoredMove {
                move_,
                original_index,
                score,
            }
        })
        .collect::<Vec<_>>();

    scored_moves.sort_by(compare_scored_moves);
    candidate_moves.clear();
    candidate_moves.extend(scored_moves.into_iter().map(|scored| scored.move_));
}

#[derive(Clone, Copy, Debug)]
struct ScoredMove {
    move_: Move,
    original_index: usize,
    score: Option<f64>,
}

fn compare_scored_moves(left: &ScoredMove, right: &ScoredMove) -> Ordering {
    match (left.score, right.score) {
        (Some(left_score), Some(right_score)) => left_score
            .total_cmp(&right_score)
            .then_with(|| left.original_index.cmp(&right.original_index)),
        (Some(_), None) => Ordering::Less,
        (None, Some(_)) => Ordering::Greater,
        (None, None) => left.original_index.cmp(&right.original_index),
    }
}
