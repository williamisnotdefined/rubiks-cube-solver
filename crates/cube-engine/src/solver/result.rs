use crate::cube::Move;

/// Search metrics reported with public solver results and failures.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct SolveMetrics {
    pub explored_nodes: usize,
}

impl SolveMetrics {
    pub const fn new(explored_nodes: usize) -> Self {
        Self { explored_nodes }
    }
}

/// Successful solver output independent of the search algorithm that produced it.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SolveResult {
    pub moves: Vec<Move>,
    pub metrics: SolveMetrics,
}

impl SolveResult {
    pub fn new(moves: Vec<Move>) -> Self {
        Self::with_metrics(moves, SolveMetrics::new(0))
    }

    pub fn with_metrics(moves: Vec<Move>, metrics: SolveMetrics) -> Self {
        Self { moves, metrics }
    }

    pub fn moves(&self) -> &[Move] {
        &self.moves
    }

    pub fn length(&self) -> usize {
        self.moves.len()
    }

    pub fn len(&self) -> usize {
        self.length()
    }

    pub fn is_empty(&self) -> bool {
        self.moves.is_empty()
    }

    pub fn metrics(&self) -> &SolveMetrics {
        &self.metrics
    }

    pub fn explored_nodes(&self) -> usize {
        self.metrics.explored_nodes
    }
}

/// Rendered cube states produced by replaying notation from a starting facelet state.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FaceletPlaybackResult {
    pub states: Vec<String>,
    pub final_is_solved: bool,
}

impl FaceletPlaybackResult {
    pub fn new(states: Vec<String>, final_is_solved: bool) -> Self {
        Self {
            states,
            final_is_solved,
        }
    }

    pub fn states(&self) -> &[String] {
        &self.states
    }

    pub fn final_is_solved(&self) -> bool {
        self.final_is_solved
    }
}
