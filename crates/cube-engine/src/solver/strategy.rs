/// Stable metadata for solver strategies exposed across the Rust/WASM boundary.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct SolverStrategyMetadata {
    pub id: &'static str,
    pub label: &'static str,
    pub solver_mode: &'static str,
    pub status_text: &'static str,
}

/// Explicit solver selection for public solver entry points.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum SolverStrategy {
    /// Existing bounded deterministic IDA* path used by product defaults.
    BoundedIdaStar,
    /// Limited two-phase baseline backed only by tiny committed fixtures.
    ///
    /// This is not a full generated-table solver and does not claim optimality or a 20-move bound.
    TwoPhaseBaseline,
    /// Generated classical two-phase path backed by local pruning-table artifacts.
    ///
    /// This path is selectable but still reports honest failures when tables or configured limits
    /// are unavailable. It does not claim optimality or a 20-move guarantee.
    GeneratedTwoPhase,
    /// Generated two-phase path that searches shorter total solution depths first.
    ///
    /// This is quality-oriented and can be slower than the standard generated strategy. It still
    /// reports honest failures when tables or configured limits are unavailable.
    GeneratedTwoPhaseQuality,
    /// Generated two-phase quality path with multiple deterministic move-order probes.
    ///
    /// This is experimental and can be slower than the regular quality strategy. It preserves
    /// replay verification and falls back to the regular quality search inside the configured budget.
    GeneratedTwoPhaseMultiprobe,
    /// Optimal IDA* path using an admissible orientation pattern database heuristic.
    ///
    /// This is a correctness-oriented baseline. It can prove optimality within a configured search
    /// budget, but it is not expected to solve arbitrary hard states quickly yet.
    OptimalIdaStarOrientationPdb,
    /// IDA* bounded by an admissible corner pattern database before falling back to quality two-phase.
    ///
    /// The PDB artifact is server-side and optional. When it is missing, this strategy preserves the
    /// generated two-phase quality fallback instead of reporting false short-solution guarantees.
    OptimalBoundedCornerPdb,
    /// IDA* bounded to 16 moves using corner and 6-edge PDB artifacts before quality two-phase fallback.
    ///
    /// This is a method-agnostic short-solution strategy. Missing PDB artifacts skip the proof attempt
    /// and fall back to generated two-phase quality without claiming that no <=16 solution exists.
    OptimalBoundedPdb16,
    /// Portfolio that spends budget on short-solution attempts before falling back to quality two-phase.
    ///
    /// It tries bounded PDB16, generated short probes, and then generated two-phase quality while
    /// preserving replay verification and honest limit failures.
    ShortSolutionPortfolio,
}

impl SolverStrategy {
    pub const ALL: [Self; 9] = [
        Self::BoundedIdaStar,
        Self::TwoPhaseBaseline,
        Self::GeneratedTwoPhase,
        Self::GeneratedTwoPhaseQuality,
        Self::GeneratedTwoPhaseMultiprobe,
        Self::OptimalIdaStarOrientationPdb,
        Self::OptimalBoundedCornerPdb,
        Self::OptimalBoundedPdb16,
        Self::ShortSolutionPortfolio,
    ];

    pub const fn metadata(self) -> SolverStrategyMetadata {
        SolverStrategyMetadata {
            id: self.id(),
            label: self.label(),
            solver_mode: self.solver_mode(),
            status_text: self.status_text(),
        }
    }

    pub const fn id(self) -> &'static str {
        match self {
            Self::BoundedIdaStar => "bounded-ida-star",
            Self::TwoPhaseBaseline => "two-phase-baseline",
            Self::GeneratedTwoPhase => "generated-two-phase",
            Self::GeneratedTwoPhaseQuality => "generated-two-phase-quality",
            Self::GeneratedTwoPhaseMultiprobe => "generated-two-phase-multiprobe",
            Self::OptimalIdaStarOrientationPdb => "optimal-ida-star-orientation-pdb",
            Self::OptimalBoundedCornerPdb => "optimal-bounded-corner-pdb",
            Self::OptimalBoundedPdb16 => "optimal-bounded-pdb16",
            Self::ShortSolutionPortfolio => "short-solution-portfolio",
        }
    }

    pub const fn label(self) -> &'static str {
        match self {
            Self::BoundedIdaStar => "Bounded IDA*",
            Self::TwoPhaseBaseline => "Limited two-phase baseline",
            Self::GeneratedTwoPhase => "Generated two-phase solver",
            Self::GeneratedTwoPhaseQuality => "Generated two-phase quality solver",
            Self::GeneratedTwoPhaseMultiprobe => "Generated two-phase multiprobe solver",
            Self::OptimalIdaStarOrientationPdb => "Optimal IDA* orientation PDB",
            Self::OptimalBoundedCornerPdb => "Optimal bounded corner PDB",
            Self::OptimalBoundedPdb16 => "Optimal bounded PDB16",
            Self::ShortSolutionPortfolio => "Short solution portfolio",
        }
    }

    pub const fn solver_mode(self) -> &'static str {
        match self {
            Self::BoundedIdaStar => "bounded_ida_star",
            Self::TwoPhaseBaseline => "limited_two_phase_baseline",
            Self::GeneratedTwoPhase => "generated_two_phase",
            Self::GeneratedTwoPhaseQuality => "generated_two_phase_quality",
            Self::GeneratedTwoPhaseMultiprobe => "generated_two_phase_multiprobe",
            Self::OptimalIdaStarOrientationPdb => "optimal_ida_star_orientation_pdb",
            Self::OptimalBoundedCornerPdb => "optimal_bounded_corner_pdb",
            Self::OptimalBoundedPdb16 => "optimal_bounded_pdb16",
            Self::ShortSolutionPortfolio => "short_solution_portfolio",
        }
    }

    pub const fn status_text(self) -> &'static str {
        match self {
            Self::BoundedIdaStar => {
                "Default product fallback. Searches within the visible limits and verifies any returned solution in Rust."
            }
            Self::TwoPhaseBaseline => {
                "Fixture-backed baseline. It covers tiny committed fixtures, so unsupported states report honest limit failures."
            }
            Self::GeneratedTwoPhase => {
                "Generated-table solver. Selectable when local pruning tables exist; otherwise reports generated tables unavailable or corrupt."
            }
            Self::GeneratedTwoPhaseQuality => {
                "Quality generated-table solver. Searches shorter total depths first before falling back to the configured max depth; requires local pruning tables."
            }
            Self::GeneratedTwoPhaseMultiprobe => {
                "Experimental quality generated-table solver. Tries several deterministic move-order probes for short solutions, then falls back to generated two-phase quality."
            }
            Self::OptimalIdaStarOrientationPdb => {
                "Optimal IDA* baseline with admissible orientation pattern databases. Useful for proof-oriented shallow searches; hard states still need larger PDBs."
            }
            Self::OptimalBoundedCornerPdb => {
                "Quality path that tries admissible corner-PDB IDA* at short limits, then falls back to generated two-phase quality when the PDB is missing or the short proof budget is exhausted."
            }
            Self::OptimalBoundedPdb16 => {
                "Short-solution path that tries admissible corner and 6-edge PDB IDA* up to 16 moves, then falls back to generated two-phase quality without claiming a <=16 guarantee."
            }
            Self::ShortSolutionPortfolio => {
                "Portfolio path that tries replay-verified <=16 attempts first, then falls back to generated two-phase quality and reports honest limit failures."
            }
        }
    }

    pub fn from_id(id: &str) -> Option<Self> {
        match id {
            "bounded-ida-star" => Some(Self::BoundedIdaStar),
            "two-phase-baseline" => Some(Self::TwoPhaseBaseline),
            "generated-two-phase" => Some(Self::GeneratedTwoPhase),
            "generated-two-phase-quality" => Some(Self::GeneratedTwoPhaseQuality),
            "generated-two-phase-multiprobe" => Some(Self::GeneratedTwoPhaseMultiprobe),
            "optimal-ida-star-orientation-pdb" => Some(Self::OptimalIdaStarOrientationPdb),
            "optimal-bounded-corner-pdb" => Some(Self::OptimalBoundedCornerPdb),
            "optimal-bounded-pdb16" => Some(Self::OptimalBoundedPdb16),
            "short-solution-portfolio" => Some(Self::ShortSolutionPortfolio),
            _ => None,
        }
    }

    pub fn supported_strategy_ids() -> String {
        Self::ALL
            .iter()
            .map(|strategy| strategy.id())
            .collect::<Vec<_>>()
            .join(", ")
    }

    pub fn unsupported_strategy_message(requested_strategy: &str) -> String {
        let displayed_strategy = if requested_strategy.is_empty() {
            "<empty>"
        } else {
            requested_strategy
        };

        format!(
            "Unsupported solver strategy \"{displayed_strategy}\". Supported strategies: {}.",
            Self::supported_strategy_ids()
        )
    }
}
