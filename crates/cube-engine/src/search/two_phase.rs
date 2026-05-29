mod artifacts;
mod baseline;
mod budget;
mod candidates;
mod constants;
mod context;
mod coordinates;
mod errors;
mod metrics;
mod move_tables;
mod ordering;
mod search;
mod solver;
mod tables;

pub use artifacts::GeneratedPruningTableArtifact;
pub use baseline::solve_two_phase_baseline;
pub use errors::GeneratedTwoPhaseError;
pub use metrics::{GeneratedTwoPhaseMetrics, GeneratedTwoPhaseSearchResult};
pub use solver::{
    solve_generated_two_phase, solve_generated_two_phase_multiprobe,
    solve_generated_two_phase_quality, solve_generated_two_phase_with_artifacts,
    GeneratedTwoPhaseSolver,
};

use budget::{
    multiprobe_node_budget, quality_depth_node_budget, quality_depth_schedule,
    quality_probe_budget, record_quality_attempt, remaining_node_budget,
};
#[cfg(test)]
use candidates::{
    phase1_candidate_moves, phase2_candidate_moves, should_skip_move, sort_phase1_candidates,
    sort_phase1_candidates_with_profile, sort_phase2_candidates, Phase1Candidate, Phase2Candidate,
};
use constants::MULTIPROBE_TARGET_DEPTH;
#[cfg(test)]
use constants::PHASE2_MOVES;
use context::TwoPhaseSearchContext;
#[cfg(test)]
use coordinates::{Phase1Coordinates, Phase2Coordinates};
#[cfg(test)]
use move_tables::{Phase1MoveTables, Phase2MoveTables};
#[cfg(test)]
use ordering::MoveOrderingProfile;
use ordering::MULTIPROBE_INVERSE_ORDERING_PROFILES;
use search::{
    solve_generated_two_phase_quality_with_tables,
    solve_generated_two_phase_quality_with_tables_and_profile,
    solve_generated_two_phase_with_tables,
};
#[cfg(test)]
use tables::table_distance_index;
use tables::GeneratedPruningTables;

use super::solution::{SearchBudget, SearchOutcome, SearchSolution};
use crate::cube::moves::Move;
#[cfg(test)]
use crate::cube::moves::FACE_MOVES;
use crate::cube::Cube;

fn solve_generated_two_phase_multiprobe_with_tables(
    start: &Cube,
    budget: SearchBudget,
    tables: &GeneratedPruningTables,
) -> Result<GeneratedTwoPhaseSearchResult, GeneratedTwoPhaseError> {
    let mut metrics = GeneratedTwoPhaseMetrics::default();
    let mut explored_nodes = 0_usize;
    let mut best_solution: Option<SearchSolution> = None;
    let target_depth = budget.max_depth.min(MULTIPROBE_TARGET_DEPTH);

    let fallback = solve_generated_two_phase_quality_schedule_with_tables(
        start,
        SearchBudget::with_limits(budget.max_depth, budget.max_nodes),
        tables,
    )?;
    if let Some(solution) = record_quality_attempt(fallback, &mut metrics, &mut explored_nodes) {
        if solution.len() <= target_depth {
            return Ok(GeneratedTwoPhaseSearchResult {
                outcome: SearchOutcome::Found(solution),
                metrics,
            });
        }
        best_solution = Some(solution);
    }

    let inverse_start = start.inverse();
    for profile in MULTIPROBE_INVERSE_ORDERING_PROFILES {
        let remaining_nodes = remaining_node_budget(budget.max_nodes, explored_nodes);
        if remaining_nodes == Some(0) {
            break;
        }

        let attempt_nodes = multiprobe_node_budget(budget.max_nodes, remaining_nodes);
        let attempt = solve_generated_two_phase_quality_with_tables_and_profile(
            &inverse_start,
            SearchBudget::with_limits(target_depth, attempt_nodes),
            tables,
            profile,
        )?;
        let attempt_nodes = attempt.metrics.explored_nodes();
        metrics = metrics.saturating_add(attempt.metrics);
        explored_nodes = explored_nodes.saturating_add(attempt_nodes);

        if let SearchOutcome::Found(inverse_solution) = attempt.outcome {
            let solution = SearchSolution::with_metrics(
                inverse_solution_moves(inverse_solution.moves()),
                explored_nodes,
            );
            if best_solution
                .as_ref()
                .is_none_or(|best| solution.len() < best.len())
            {
                best_solution = Some(solution);
            }
            if best_solution
                .as_ref()
                .is_some_and(|solution| solution.len() <= target_depth)
            {
                break;
            }
        }
    }

    if let Some(solution) = best_solution {
        return Ok(GeneratedTwoPhaseSearchResult {
            outcome: SearchOutcome::Found(SearchSolution::with_metrics(
                solution.moves,
                explored_nodes,
            )),
            metrics,
        });
    }

    Ok(GeneratedTwoPhaseSearchResult {
        outcome: SearchOutcome::NotFoundWithinLimits { explored_nodes },
        metrics,
    })
}

fn inverse_solution_moves(moves: &[Move]) -> Vec<Move> {
    moves.iter().rev().map(|move_| move_.inverse()).collect()
}

fn solve_generated_two_phase_quality_schedule_with_tables(
    start: &Cube,
    budget: SearchBudget,
    tables: &GeneratedPruningTables,
) -> Result<GeneratedTwoPhaseSearchResult, GeneratedTwoPhaseError> {
    let mut metrics = GeneratedTwoPhaseMetrics::default();
    let mut explored_nodes = 0_usize;
    let probe =
        solve_generated_two_phase_quality_with_tables(start, quality_probe_budget(budget), tables)?;

    if let Some(solution) = record_quality_attempt(probe, &mut metrics, &mut explored_nodes) {
        return Ok(GeneratedTwoPhaseSearchResult {
            outcome: SearchOutcome::Found(solution),
            metrics,
        });
    }

    for depth_limit in quality_depth_schedule(budget.max_depth) {
        let remaining_nodes = remaining_node_budget(budget.max_nodes, explored_nodes);
        if remaining_nodes == Some(0) {
            break;
        }
        let attempt_nodes = if depth_limit == budget.max_depth {
            remaining_nodes
        } else {
            quality_depth_node_budget(budget.max_nodes, remaining_nodes, depth_limit)
        };

        let attempt = solve_generated_two_phase_with_tables(
            start,
            SearchBudget::with_limits(depth_limit, attempt_nodes),
            tables,
        )?;
        if let Some(solution) = record_quality_attempt(attempt, &mut metrics, &mut explored_nodes) {
            return Ok(GeneratedTwoPhaseSearchResult {
                outcome: SearchOutcome::Found(solution),
                metrics,
            });
        }
    }

    Ok(GeneratedTwoPhaseSearchResult {
        outcome: SearchOutcome::NotFoundWithinLimits { explored_nodes },
        metrics,
    })
}

#[cfg(test)]
mod tests {
    use super::{
        inverse_solution_moves, multiprobe_node_budget, phase1_candidate_moves,
        phase2_candidate_moves, quality_depth_node_budget, quality_depth_schedule,
        quality_probe_budget, record_quality_attempt, should_skip_move, sort_phase1_candidates,
        sort_phase1_candidates_with_profile, sort_phase2_candidates, table_distance_index,
        GeneratedTwoPhaseMetrics, GeneratedTwoPhaseSearchResult, MoveOrderingProfile,
        Phase1Candidate, Phase1Coordinates, Phase1MoveTables, Phase2Candidate, Phase2Coordinates,
        Phase2MoveTables, TwoPhaseSearchContext, FACE_MOVES, PHASE2_MOVES,
    };
    use crate::cube::{Cube, Move};
    use crate::search::pruning::{
        PruningCoordinate, PruningGenerationParameters, PruningPhaseRole, PruningTable,
        PruningTableMetadata,
    };
    use crate::search::{SearchBudget, SearchOutcome, SearchSolution};

    #[test]
    fn missing_depth_limited_table_entry_is_lower_bound_above_generated_depth() {
        let metadata = PruningTableMetadata::new(
            2,
            "test-depth-limited-v1",
            PruningPhaseRole::Phase1,
            vec![PruningCoordinate::new("coordinate", 2)],
            PruningGenerationParameters::new(6, "test-moves", "test"),
        );
        let table = PruningTable::from_dense_entries(metadata, vec![0, u8::MAX])
            .expect("test table should be valid");
        let mut context = TwoPhaseSearchContext::new(None);

        assert_eq!(
            table_distance_index("phase1", &table, 1, &mut context),
            Ok(7)
        );
        assert_eq!(context.metrics.table_missing_entries, 1);
    }

    #[test]
    fn search_context_records_quality_depths_and_best_solution_candidate() {
        let mut context = TwoPhaseSearchContext::new(None);

        context.record_total_depth_attempt(16);
        context.record_total_depth_attempt(18);
        context.record_solution_candidate(5, 7);
        context.record_solution_candidate(4, 6);

        assert_eq!(context.metrics.total_depth_attempts, 2);
        assert_eq!(context.metrics.max_total_depth_attempted, Some(18));
        assert_eq!(context.metrics.solutions_found, 2);
        assert_eq!(context.metrics.best_solution_length, Some(10));
        assert_eq!(context.metrics.best_phase1_length, Some(4));
        assert_eq!(context.metrics.best_phase2_length, Some(6));
    }

    #[test]
    fn quality_probe_budget_uses_short_depth_and_small_node_slice() {
        assert_eq!(
            quality_probe_budget(SearchBudget::with_limits(30, Some(10_000_000))),
            SearchBudget::with_limits(16, Some(2_000_000))
        );
        assert_eq!(
            quality_probe_budget(SearchBudget::with_limits(12, Some(500))),
            SearchBudget::with_limits(12, Some(500))
        );
        assert_eq!(
            quality_probe_budget(SearchBudget::with_limits(30, None)),
            SearchBudget::with_limits(16, Some(3_000_000))
        );
    }

    #[test]
    fn quality_depth_schedule_targets_gods_number_buckets_before_full_depth() {
        assert_eq!(quality_depth_schedule(0), vec![0]);
        assert_eq!(quality_depth_schedule(17), vec![16, 17]);
        assert_eq!(quality_depth_schedule(20), vec![16, 18, 20]);
        assert_eq!(quality_depth_schedule(30), vec![16, 18, 20, 30]);
    }

    #[test]
    fn quality_depth_node_budget_slices_short_depth_attempts() {
        assert_eq!(
            quality_depth_node_budget(Some(10_000_000), Some(9_000_000), 16),
            Some(2_000_000)
        );
        assert_eq!(
            quality_depth_node_budget(Some(10_000_000), Some(9_000_000), 18),
            Some(1_000_000)
        );
        assert_eq!(
            quality_depth_node_budget(Some(10_000_000), Some(9_000_000), 20),
            Some(3_000_000)
        );
        assert_eq!(
            quality_depth_node_budget(Some(50_000_000), Some(49_000_000), 20),
            Some(40_000_000)
        );
        assert_eq!(
            quality_depth_node_budget(Some(10_000_000), Some(250), 20),
            Some(250)
        );
    }

    #[test]
    fn multiprobe_node_budget_preserves_fallback_budget() {
        assert_eq!(
            multiprobe_node_budget(Some(10_000_000), Some(9_000_000)),
            Some(2_000_000)
        );
        assert_eq!(
            multiprobe_node_budget(Some(10_000_000), Some(500)),
            Some(500)
        );
        assert_eq!(multiprobe_node_budget(None, None), Some(2_000_000));
    }

    #[test]
    fn inverse_solution_moves_reverses_and_inverts_moves() {
        assert_eq!(
            inverse_solution_moves(&[Move::R, Move::U2, Move::FPrime]),
            vec![Move::F, Move::U2, Move::RPrime]
        );
    }

    #[test]
    fn record_quality_attempt_combines_explored_nodes_and_metrics() {
        let mut metrics = GeneratedTwoPhaseMetrics {
            phase1_nodes: 7,
            phase2_nodes: 3,
            total_depth_attempts: 1,
            max_total_depth_attempted: Some(16),
            ..GeneratedTwoPhaseMetrics::default()
        };
        let mut explored_nodes = metrics.explored_nodes();
        let attempt = GeneratedTwoPhaseSearchResult {
            outcome: SearchOutcome::Found(SearchSolution::with_metrics(vec![Move::U], 4)),
            metrics: GeneratedTwoPhaseMetrics {
                phase1_nodes: 3,
                phase2_nodes: 1,
                solutions_found: 1,
                best_solution_length: Some(1),
                best_phase1_length: Some(0),
                best_phase2_length: Some(1),
                ..GeneratedTwoPhaseMetrics::default()
            },
        };

        let solution = record_quality_attempt(attempt, &mut metrics, &mut explored_nodes)
            .expect("found attempt should return a cumulative solution");

        assert_eq!(metrics.explored_nodes(), 14);
        assert_eq!(metrics.total_depth_attempts, 1);
        assert_eq!(metrics.max_total_depth_attempted, Some(16));
        assert_eq!(metrics.solutions_found, 1);
        assert_eq!(metrics.best_solution_length, Some(1));
        assert_eq!(explored_nodes, 14);
        assert_eq!(solution.explored_nodes(), 14);
    }

    #[test]
    fn move_pruning_skips_same_face_turns() {
        assert!(should_skip_move(Some(Move::R), Move::R2));
        assert!(should_skip_move(Some(Move::U), Move::UPrime));
        assert!(should_skip_move(Some(Move::F2), Move::FPrime));
    }

    #[test]
    fn move_pruning_canonicalizes_opposite_faces_on_same_axis() {
        assert!(!should_skip_move(Some(Move::U), Move::D));
        assert!(should_skip_move(Some(Move::D), Move::U));
        assert!(!should_skip_move(Some(Move::L), Move::R));
        assert!(should_skip_move(Some(Move::R), Move::L));
        assert!(!should_skip_move(Some(Move::F), Move::B));
        assert!(should_skip_move(Some(Move::B), Move::F));
    }

    #[test]
    fn move_pruning_keeps_different_axes_available() {
        assert!(!should_skip_move(None, Move::U));
        assert!(!should_skip_move(Some(Move::U), Move::R));
        assert!(!should_skip_move(Some(Move::F), Move::D));
        assert!(!should_skip_move(Some(Move::L2), Move::BPrime));
    }

    #[test]
    fn phase1_candidate_moves_exclude_pruned_moves() {
        let after_d = phase1_candidate_moves(Some(Move::D)).collect::<Vec<_>>();
        let after_d_moves = after_d.iter().map(|(_, move_)| *move_).collect::<Vec<_>>();

        assert!(!after_d_moves.contains(&Move::U));
        assert!(!after_d_moves.contains(&Move::UPrime));
        assert!(!after_d_moves.contains(&Move::U2));
        assert!(!after_d_moves.contains(&Move::D));
        assert!(!after_d_moves.contains(&Move::DPrime));
        assert!(!after_d_moves.contains(&Move::D2));

        let after_u_moves = phase1_candidate_moves(Some(Move::U))
            .map(|(_, move_)| move_)
            .collect::<Vec<_>>();
        assert!(after_u_moves.contains(&Move::D));
        assert!(after_u_moves.contains(&Move::DPrime));
        assert!(after_u_moves.contains(&Move::D2));
    }

    #[test]
    fn phase1_candidates_sort_by_estimated_total_then_heuristic_then_move_order() {
        let coordinates = Phase1Coordinates {
            corner_orientation: 0,
            edge_orientation: 0,
            ud_slice: 0,
        };
        let mut candidates = vec![
            Phase1Candidate {
                move_index: 4,
                move_: Move::DPrime,
                coordinates,
                heuristic: 3,
                estimated_total: 5,
            },
            Phase1Candidate {
                move_index: 2,
                move_: Move::U2,
                coordinates,
                heuristic: 2,
                estimated_total: 5,
            },
            Phase1Candidate {
                move_index: 1,
                move_: Move::UPrime,
                coordinates,
                heuristic: 2,
                estimated_total: 5,
            },
            Phase1Candidate {
                move_index: 0,
                move_: Move::U,
                coordinates,
                heuristic: 1,
                estimated_total: 7,
            },
        ];

        sort_phase1_candidates(&mut candidates);

        assert_eq!(
            candidates
                .iter()
                .map(|candidate| candidate.move_)
                .collect::<Vec<_>>(),
            vec![Move::UPrime, Move::U2, Move::DPrime, Move::U]
        );
    }

    #[test]
    fn phase1_multiprobe_profile_can_prioritize_half_turns() {
        let coordinates = Phase1Coordinates {
            corner_orientation: 0,
            edge_orientation: 0,
            ud_slice: 0,
        };
        let mut candidates = vec![
            Phase1Candidate {
                move_index: 0,
                move_: Move::U,
                coordinates,
                heuristic: 2,
                estimated_total: 5,
            },
            Phase1Candidate {
                move_index: 1,
                move_: Move::U2,
                coordinates,
                heuristic: 2,
                estimated_total: 5,
            },
        ];

        sort_phase1_candidates_with_profile(&mut candidates, MoveOrderingProfile::HalfTurnsFirst);

        assert_eq!(
            candidates
                .iter()
                .map(|candidate| candidate.move_)
                .collect::<Vec<_>>(),
            vec![Move::U2, Move::U]
        );
    }

    #[test]
    fn phase2_candidate_moves_exclude_pruned_moves() {
        let after_r_moves = phase2_candidate_moves(Some(Move::R2))
            .map(|(_, move_)| move_)
            .collect::<Vec<_>>();

        assert!(!after_r_moves.contains(&Move::L2));
        assert!(!after_r_moves.contains(&Move::R2));
        assert!(after_r_moves.contains(&Move::U));
        assert!(after_r_moves.contains(&Move::D));
        assert!(after_r_moves.contains(&Move::F2));
    }

    #[test]
    fn phase2_candidates_sort_by_estimated_total_then_heuristic_then_move_order() {
        let coordinates = Phase2Coordinates {
            corner_permutation: 0,
            ud_edge_permutation: 0,
            slice_edge_permutation: 0,
        };
        let mut candidates = vec![
            Phase2Candidate {
                move_index: 5,
                move_: Move::D2,
                coordinates,
                heuristic: 3,
                estimated_total: 5,
            },
            Phase2Candidate {
                move_index: 2,
                move_: Move::U2,
                coordinates,
                heuristic: 2,
                estimated_total: 5,
            },
            Phase2Candidate {
                move_index: 1,
                move_: Move::UPrime,
                coordinates,
                heuristic: 2,
                estimated_total: 5,
            },
            Phase2Candidate {
                move_index: 0,
                move_: Move::U,
                coordinates,
                heuristic: 1,
                estimated_total: 7,
            },
        ];

        sort_phase2_candidates(&mut candidates);

        assert_eq!(
            candidates
                .iter()
                .map(|candidate| candidate.move_)
                .collect::<Vec<_>>(),
            vec![Move::UPrime, Move::U2, Move::D2, Move::U]
        );
    }

    #[test]
    fn phase1_move_tables_match_cube_move_semantics_for_sample_states() {
        let tables = Phase1MoveTables::generate().expect("phase1 move tables should build");
        let samples = [
            Vec::new(),
            vec![Move::R, Move::U],
            vec![Move::F, Move::R, Move::UPrime, Move::B2],
            vec![Move::L2, Move::DPrime, Move::F, Move::U2, Move::RPrime],
        ];

        for moves in samples {
            let mut cube = Cube::solved();
            cube.apply_moves(&moves);
            let coordinates = Phase1Coordinates::try_from_cube(&cube)
                .expect("sample cube should have phase1 coordinates");

            for (move_index, move_) in FACE_MOVES.into_iter().enumerate() {
                let mut next_cube = cube.clone();
                next_cube.apply_move(move_);
                let expected = Phase1Coordinates::try_from_cube(&next_cube)
                    .expect("moved sample cube should have phase1 coordinates");

                assert_eq!(
                    tables.next(coordinates, move_index),
                    expected,
                    "phase1 move table should match cube semantics for {move_:?} after {moves:?}"
                );
            }
        }
    }

    #[test]
    fn phase2_move_tables_match_cube_move_semantics_for_sample_g1_states() {
        let tables = Phase2MoveTables::generate().expect("phase2 move tables should build");
        let samples = [
            Vec::new(),
            vec![Move::U, Move::R2, Move::F2, Move::D],
            vec![Move::L2, Move::DPrime, Move::B2, Move::U2, Move::R2],
            vec![
                Move::U,
                Move::DPrime,
                Move::L2,
                Move::F2,
                Move::B2,
                Move::R2,
            ],
        ];

        for moves in samples {
            let mut cube = Cube::solved();
            cube.apply_moves(&moves);
            let coordinates = Phase2Coordinates::try_from_cube(&cube)
                .expect("sample G1 cube should have phase2 coordinates");

            for (move_index, move_) in PHASE2_MOVES.into_iter().enumerate() {
                let mut next_cube = cube.clone();
                next_cube.apply_move(move_);
                let expected = Phase2Coordinates::try_from_cube(&next_cube)
                    .expect("moved sample G1 cube should have phase2 coordinates");

                assert_eq!(
                    tables.next(coordinates, move_index),
                    expected,
                    "phase2 move table should match cube semantics for {move_:?} after {moves:?}"
                );
            }
        }
    }
}
