use crate::puzzles::cube2::{CUBE2_BOUNDED_IDA_STAR_STRATEGY_ID, CUBE2_PDB_IDA_STAR_STRATEGY_ID};
use crate::solver::SolverStrategy;

use super::{
    InputKind, MoveMetric, PuzzleDefinition, PuzzleFamily, PuzzleId, PuzzleStatus,
    SolverStrategyDefinition, VisualizationKind,
};

const CUBE3_INPUTS: [InputKind; 3] = [
    InputKind::Notation,
    InputKind::Facelets3x3,
    InputKind::Scan3x3,
];
const CUBE3_VISUALIZATIONS: [VisualizationKind; 1] = [VisualizationKind::Cube3FaceletsV1];
const CUBE2_INPUTS: [InputKind; 2] = [InputKind::Notation, InputKind::Scan2x2];
const CUBE2_VISUALIZATIONS: [VisualizationKind; 1] = [VisualizationKind::Cube2FaceletsV1];
const PLANNED_INPUTS: [InputKind; 0] = [];
const PLANNED_VISUALIZATIONS: [VisualizationKind; 0] = [];
const HTM_METRICS: [MoveMetric; 1] = [MoveMetric::Htm];
const NO_STRATEGIES: [&str; 0] = [];

const CUBE3_STRATEGY_IDS: [&str; 7] = [
    SolverStrategy::BoundedIdaStar.id(),
    SolverStrategy::GeneratedTwoPhase.id(),
    SolverStrategy::GeneratedTwoPhaseQuality.id(),
    SolverStrategy::GeneratedTwoPhaseMultiprobe.id(),
    SolverStrategy::OptimalBoundedCornerPdb.id(),
    SolverStrategy::OptimalBoundedPdb16.id(),
    SolverStrategy::ShortSolutionPortfolio.id(),
];

const CUBE2_STRATEGY_IDS: [&str; 2] = [
    CUBE2_BOUNDED_IDA_STAR_STRATEGY_ID,
    CUBE2_PDB_IDA_STAR_STRATEGY_ID,
];

const PUZZLES: [PuzzleDefinition; 8] = [
    PuzzleDefinition {
        id: PuzzleId::Cube3x3x3,
        slug: PuzzleId::Cube3x3x3.slug(),
        label: "3x3x3 Cube",
        family: PuzzleFamily::Cube,
        status: PuzzleStatus::Stable,
        default_metric: MoveMetric::Htm,
        supported_inputs: &CUBE3_INPUTS,
        supported_visualizations: &CUBE3_VISUALIZATIONS,
        default_strategy_id: Some(SolverStrategy::GeneratedTwoPhase.id()),
        strategy_ids: &CUBE3_STRATEGY_IDS,
        scanner_supported: true,
    },
    PuzzleDefinition {
        id: PuzzleId::Cube2x2x2,
        slug: PuzzleId::Cube2x2x2.slug(),
        label: "2x2x2 Cube",
        family: PuzzleFamily::Cube,
        status: PuzzleStatus::Experimental,
        default_metric: MoveMetric::Htm,
        supported_inputs: &CUBE2_INPUTS,
        supported_visualizations: &CUBE2_VISUALIZATIONS,
        default_strategy_id: Some(CUBE2_PDB_IDA_STAR_STRATEGY_ID),
        strategy_ids: &CUBE2_STRATEGY_IDS,
        scanner_supported: true,
    },
    planned_puzzle(PuzzleId::Pyraminx, "Pyraminx", PuzzleFamily::Pyraminx),
    planned_puzzle(PuzzleId::Clock, "Clock", PuzzleFamily::Clock),
    planned_puzzle(PuzzleId::Skewb, "Skewb", PuzzleFamily::Skewb),
    planned_puzzle(PuzzleId::CubeNxN, "NxNxN Cube", PuzzleFamily::Cube),
    planned_puzzle(PuzzleId::Square1, "Square-1", PuzzleFamily::Square1),
    planned_puzzle(PuzzleId::Megaminx, "Megaminx", PuzzleFamily::Megaminx),
];

const CUBE3_STRATEGIES: [SolverStrategyDefinition; 7] = [
    cube3_strategy(SolverStrategy::BoundedIdaStar),
    cube3_strategy(SolverStrategy::GeneratedTwoPhase),
    cube3_strategy(SolverStrategy::GeneratedTwoPhaseQuality),
    cube3_strategy(SolverStrategy::GeneratedTwoPhaseMultiprobe),
    cube3_strategy(SolverStrategy::OptimalBoundedCornerPdb),
    cube3_strategy(SolverStrategy::OptimalBoundedPdb16),
    cube3_strategy(SolverStrategy::ShortSolutionPortfolio),
];

const CUBE2_STRATEGIES: [SolverStrategyDefinition; 2] = [
    SolverStrategyDefinition {
        id: CUBE2_BOUNDED_IDA_STAR_STRATEGY_ID,
        puzzle_id: PuzzleId::Cube2x2x2,
        label: "2x2 Bounded IDA*",
        solver_mode: "cube2_bounded_ida_star",
        status_text: "Experimental 2x2 depth-bounded solver",
        default_metric: MoveMetric::Htm,
        supported_metrics: &HTM_METRICS,
        supported_inputs: &CUBE2_INPUTS,
    },
    SolverStrategyDefinition {
        id: CUBE2_PDB_IDA_STAR_STRATEGY_ID,
        puzzle_id: PuzzleId::Cube2x2x2,
        label: "2x2 PDB IDA*",
        solver_mode: "cube2_pdb_ida_star",
        status_text: "Experimental 2x2 solver with in-memory PDB heuristic",
        default_metric: MoveMetric::Htm,
        supported_metrics: &HTM_METRICS,
        supported_inputs: &CUBE2_INPUTS,
    },
];

const ALL_STRATEGIES: [SolverStrategyDefinition; 9] = [
    CUBE3_STRATEGIES[0],
    CUBE3_STRATEGIES[1],
    CUBE3_STRATEGIES[2],
    CUBE3_STRATEGIES[3],
    CUBE3_STRATEGIES[4],
    CUBE3_STRATEGIES[5],
    CUBE3_STRATEGIES[6],
    CUBE2_STRATEGIES[0],
    CUBE2_STRATEGIES[1],
];

const fn planned_puzzle(
    id: PuzzleId,
    label: &'static str,
    family: PuzzleFamily,
) -> PuzzleDefinition {
    PuzzleDefinition {
        id,
        slug: id.slug(),
        label,
        family,
        status: PuzzleStatus::Planned,
        default_metric: MoveMetric::Htm,
        supported_inputs: &PLANNED_INPUTS,
        supported_visualizations: &PLANNED_VISUALIZATIONS,
        default_strategy_id: None,
        strategy_ids: &NO_STRATEGIES,
        scanner_supported: false,
    }
}

const fn cube3_strategy(strategy: SolverStrategy) -> SolverStrategyDefinition {
    let metadata = strategy.metadata();

    SolverStrategyDefinition {
        id: metadata.id,
        puzzle_id: PuzzleId::Cube3x3x3,
        label: metadata.label,
        solver_mode: metadata.solver_mode,
        status_text: metadata.status_text,
        default_metric: MoveMetric::Htm,
        supported_metrics: &HTM_METRICS,
        supported_inputs: &CUBE3_INPUTS,
    }
}

pub fn all_puzzle_definitions() -> &'static [PuzzleDefinition] {
    &PUZZLES
}

pub fn puzzle_definition(id: PuzzleId) -> Option<&'static PuzzleDefinition> {
    PUZZLES.iter().find(|puzzle| puzzle.id == id)
}

pub fn puzzle_definition_by_slug(slug: &str) -> Option<&'static PuzzleDefinition> {
    PuzzleId::from_slug(slug).and_then(puzzle_definition)
}

pub fn all_strategy_definitions() -> &'static [SolverStrategyDefinition] {
    &ALL_STRATEGIES
}

pub fn strategies_for_puzzle(puzzle_id: PuzzleId) -> &'static [SolverStrategyDefinition] {
    match puzzle_id {
        PuzzleId::Cube3x3x3 => &CUBE3_STRATEGIES,
        PuzzleId::Cube2x2x2 => &CUBE2_STRATEGIES,
        PuzzleId::Pyraminx
        | PuzzleId::Clock
        | PuzzleId::Skewb
        | PuzzleId::CubeNxN
        | PuzzleId::Square1
        | PuzzleId::Megaminx => &[],
    }
}

pub fn strategy_definition_for_puzzle(
    puzzle_id: PuzzleId,
    strategy_id: &str,
) -> Option<&'static SolverStrategyDefinition> {
    strategies_for_puzzle(puzzle_id)
        .iter()
        .find(|strategy| strategy.id == strategy_id)
}

#[cfg(test)]
mod tests {
    use super::{
        all_puzzle_definitions, all_strategy_definitions, puzzle_definition_by_slug,
        strategies_for_puzzle, strategy_definition_for_puzzle,
    };
    use crate::puzzle::{
        InputKind, MoveMetric, PuzzleFamily, PuzzleId, PuzzleStatus, VisualizationKind,
    };
    use crate::solver::SolverStrategy;

    #[test]
    fn puzzle_registry_contains_initial_many_cubes_scope() {
        let definitions = all_puzzle_definitions();

        assert_eq!(definitions.len(), PuzzleId::ALL.len());
        for puzzle_id in PuzzleId::ALL {
            assert!(definitions
                .iter()
                .any(|definition| definition.id == puzzle_id));
        }
    }

    #[test]
    fn puzzle_registry_marks_current_3x3_as_stable() {
        let definition = puzzle_definition_by_slug("cube-3x3x3").expect("3x3 should exist");

        assert_eq!(definition.id, PuzzleId::Cube3x3x3);
        assert_eq!(definition.slug, "cube-3x3x3");
        assert_eq!(definition.family, PuzzleFamily::Cube);
        assert_eq!(definition.status, PuzzleStatus::Stable);
        assert_eq!(definition.default_metric, MoveMetric::Htm);
        assert_eq!(definition.default_strategy_id, Some("generated-two-phase"));
        assert_eq!(
            definition.supported_inputs,
            &[
                InputKind::Notation,
                InputKind::Facelets3x3,
                InputKind::Scan3x3
            ]
        );
        assert!(definition.scanner_supported);
    }

    #[test]
    fn puzzle_registry_marks_2x2_as_experimental_with_solver_capability() {
        let definition = puzzle_definition_by_slug("cube-2x2x2").expect("2x2 should exist");

        assert_eq!(definition.id, PuzzleId::Cube2x2x2);
        assert_eq!(definition.status, PuzzleStatus::Experimental);
        assert_eq!(definition.default_strategy_id, Some("cube2-pdb-ida-star"));
        assert_eq!(
            definition.strategy_ids,
            &["cube2-bounded-ida-star", "cube2-pdb-ida-star"]
        );
        assert_eq!(
            definition.supported_inputs,
            &[InputKind::Notation, InputKind::Scan2x2]
        );
        assert_eq!(
            definition.supported_visualizations,
            &[VisualizationKind::Cube2FaceletsV1]
        );
        assert!(definition.scanner_supported);
    }

    #[test]
    fn strategy_ids_remain_stable() {
        let ids = all_strategy_definitions()
            .iter()
            .map(|strategy| strategy.id)
            .collect::<Vec<_>>();

        assert_eq!(
            ids,
            vec![
                "bounded-ida-star",
                "generated-two-phase",
                "generated-two-phase-quality",
                "generated-two-phase-multiprobe",
                "optimal-bounded-corner-pdb",
                "optimal-bounded-pdb16",
                "short-solution-portfolio",
                "cube2-bounded-ida-star",
                "cube2-pdb-ida-star",
            ]
        );
    }

    #[test]
    fn current_3x3_strategies_are_scoped_to_3x3() {
        let definitions = strategies_for_puzzle(PuzzleId::Cube3x3x3);

        assert_eq!(definitions.len(), SolverStrategy::ALL.len());
        for strategy in definitions {
            assert_eq!(strategy.puzzle_id, PuzzleId::Cube3x3x3);
            assert_eq!(strategy.default_metric, MoveMetric::Htm);
            assert_eq!(strategy.supported_metrics, &[MoveMetric::Htm]);
            assert_eq!(
                strategy.supported_inputs,
                &[
                    InputKind::Notation,
                    InputKind::Facelets3x3,
                    InputKind::Scan3x3
                ]
            );
        }
    }

    #[test]
    fn current_2x2_strategies_are_scoped_to_2x2() {
        let definitions = strategies_for_puzzle(PuzzleId::Cube2x2x2);

        assert_eq!(definitions.len(), 2);
        for strategy in definitions {
            assert_eq!(strategy.puzzle_id, PuzzleId::Cube2x2x2);
            assert_eq!(strategy.default_metric, MoveMetric::Htm);
            assert_eq!(strategy.supported_metrics, &[MoveMetric::Htm]);
            assert_eq!(
                strategy.supported_inputs,
                &[InputKind::Notation, InputKind::Scan2x2]
            );
        }
    }

    #[test]
    fn strategies_do_not_cross_puzzle_boundaries() {
        assert!(strategy_definition_for_puzzle(PuzzleId::Cube2x2x2, "bounded-ida-star").is_none());
        assert!(
            strategy_definition_for_puzzle(PuzzleId::Cube3x3x3, "cube2-bounded-ida-star").is_none()
        );
    }

    #[test]
    fn strategy_lookup_requires_matching_puzzle() {
        let strategy = strategy_definition_for_puzzle(PuzzleId::Cube3x3x3, "bounded-ida-star")
            .expect("3x3 strategy should exist");

        assert_eq!(strategy.solver_mode, "bounded_ida_star");
        assert!(strategy_definition_for_puzzle(PuzzleId::Cube3x3x3, "missing").is_none());
    }
}
