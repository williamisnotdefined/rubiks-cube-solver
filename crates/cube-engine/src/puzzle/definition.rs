use super::PuzzleId;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PuzzleFamily {
    Cube,
    Pyraminx,
    Clock,
    Skewb,
    Square1,
    Megaminx,
}

impl PuzzleFamily {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Cube => "cube",
            Self::Pyraminx => "pyraminx",
            Self::Clock => "clock",
            Self::Skewb => "skewb",
            Self::Square1 => "square1",
            Self::Megaminx => "megaminx",
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PuzzleStatus {
    Stable,
    Experimental,
    Planned,
    Disabled,
}

impl PuzzleStatus {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Stable => "stable",
            Self::Experimental => "experimental",
            Self::Planned => "planned",
            Self::Disabled => "disabled",
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MoveMetric {
    Htm,
}

impl MoveMetric {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Htm => "htm",
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum InputKind {
    Notation,
    Facelets3x3,
    Scan3x3,
}

impl InputKind {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Notation => "notation",
            Self::Facelets3x3 => "facelets3x3",
            Self::Scan3x3 => "scan3x3",
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum VisualizationKind {
    Cube3FaceletsV1,
    None,
}

impl VisualizationKind {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Cube3FaceletsV1 => "cube3-facelets-v1",
            Self::None => "none",
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct PuzzleDefinition {
    pub id: PuzzleId,
    pub slug: &'static str,
    pub label: &'static str,
    pub family: PuzzleFamily,
    pub status: PuzzleStatus,
    pub default_metric: MoveMetric,
    pub supported_inputs: &'static [InputKind],
    pub supported_visualizations: &'static [VisualizationKind],
    pub default_strategy_id: Option<&'static str>,
    pub strategy_ids: &'static [&'static str],
    pub scanner_supported: bool,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct SolverStrategyDefinition {
    pub id: &'static str,
    pub puzzle_id: PuzzleId,
    pub label: &'static str,
    pub solver_mode: &'static str,
    pub status_text: &'static str,
    pub default_metric: MoveMetric,
    pub supported_metrics: &'static [MoveMetric],
    pub supported_inputs: &'static [InputKind],
}
