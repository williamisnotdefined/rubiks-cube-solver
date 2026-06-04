mod definition;
mod ids;
mod registry;

pub use definition::{
    InputKind, MoveMetric, PuzzleDefinition, PuzzleFamily, PuzzleStatus, SolverStrategyDefinition,
    VisualizationKind,
};
pub use ids::PuzzleId;
pub use registry::{
    all_puzzle_definitions, all_strategy_definitions, puzzle_definition, puzzle_definition_by_slug,
    strategies_for_puzzle, strategy_definition_for_puzzle,
};
