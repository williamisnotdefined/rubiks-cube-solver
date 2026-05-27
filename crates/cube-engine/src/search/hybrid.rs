use std::cmp::Ordering;
use std::collections::{BTreeMap, HashMap};
use std::fs;
use std::io;
use std::path::Path;

use super::heuristics::ZeroHeuristic;
use super::ida_star::solve_ida_star_bounded_with_ordered_moves;
use super::solution::{SearchBudget, SearchOutcome};
use crate::cube::{Cube, CubieState, Move};

pub(crate) const DEFAULT_HYBRID_VALUE_OUTPUT_PATH: &str =
    "ml/outputs/value-baseline/value_outputs.tsv";

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum HybridValueArtifactStatus {
    Available,
    Missing,
    DependencyFallback,
    Malformed,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct HybridValueArtifactMetadata {
    fields: BTreeMap<String, String>,
    value_rows: usize,
}

impl HybridValueArtifactMetadata {
    fn new(fields: BTreeMap<String, String>, value_rows: usize) -> Self {
        Self { fields, value_rows }
    }

    pub(crate) fn summary_label(&self) -> String {
        let mut parts = [
            "format",
            "model_type",
            "pytorch_available",
            "examples",
            "label_target",
            "label_source",
        ]
        .iter()
        .filter_map(|key| self.fields.get(*key).map(|value| format!("{key}={value}")))
        .collect::<Vec<_>>();
        parts.push(format!("value_rows={}", self.value_rows));

        parts.join(";")
    }

    fn field(&self, key: &str) -> Option<&str> {
        self.fields.get(key).map(String::as_str)
    }
}

#[derive(Clone, Debug)]
pub(crate) struct HybridValueTable {
    metadata: HybridValueArtifactMetadata,
    values: HashMap<String, f64>,
}

impl HybridValueTable {
    pub(crate) fn metadata(&self) -> &HybridValueArtifactMetadata {
        &self.metadata
    }

    fn predicted_value(&self, state: &CubieState) -> Option<f64> {
        self.values.get(&state.serialize()).copied()
    }
}

#[derive(Clone, Debug)]
pub(crate) enum HybridValueArtifact {
    Available(HybridValueTable),
    Missing {
        message: String,
    },
    DependencyFallback {
        metadata: HybridValueArtifactMetadata,
    },
    Malformed {
        message: String,
        metadata: Option<HybridValueArtifactMetadata>,
    },
}

impl HybridValueArtifact {
    pub(crate) fn status(&self) -> HybridValueArtifactStatus {
        match self {
            Self::Available(_) => HybridValueArtifactStatus::Available,
            Self::Missing { .. } => HybridValueArtifactStatus::Missing,
            Self::DependencyFallback { .. } => HybridValueArtifactStatus::DependencyFallback,
            Self::Malformed { .. } => HybridValueArtifactStatus::Malformed,
        }
    }

    pub(crate) fn metadata_label(&self) -> Option<String> {
        match self {
            Self::Available(table) => Some(table.metadata().summary_label()),
            Self::DependencyFallback { metadata } => Some(metadata.summary_label()),
            Self::Malformed {
                message,
                metadata: Some(metadata),
            } => Some(format!("{};error={}", metadata.summary_label(), message)),
            Self::Malformed { message, .. } => Some(format!("error={message}")),
            Self::Missing { message } => Some(message.clone()),
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub(crate) struct HybridMoveOrderingMetrics {
    pub(crate) scored_move_lookups: usize,
    pub(crate) missing_score_lookups: usize,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct HybridSearchResult {
    pub(crate) outcome: SearchOutcome,
    pub(crate) metrics: HybridMoveOrderingMetrics,
}

pub(crate) fn load_hybrid_value_outputs(path: impl AsRef<Path>) -> HybridValueArtifact {
    match fs::read_to_string(path.as_ref()) {
        Ok(content) => parse_hybrid_value_outputs(&content),
        Err(error) if error.kind() == io::ErrorKind::NotFound => HybridValueArtifact::Missing {
            message: format!("missing:{}", path.as_ref().display()),
        },
        Err(error) => HybridValueArtifact::Malformed {
            message: format!("read_error:{}:{error}", path.as_ref().display()),
            metadata: None,
        },
    }
}

pub(crate) fn solve_hybrid_move_ordering(
    start: &Cube,
    budget: SearchBudget,
    value_table: &HybridValueTable,
) -> HybridSearchResult {
    let mut metrics = HybridMoveOrderingMetrics::default();
    let heuristic = ZeroHeuristic;
    let outcome = solve_ida_star_bounded_with_ordered_moves(
        start,
        budget,
        &heuristic,
        |cube, candidate_moves| {
            order_moves_by_value_outputs(cube, candidate_moves, value_table, &mut metrics);
        },
    );

    HybridSearchResult { outcome, metrics }
}

fn parse_hybrid_value_outputs(content: &str) -> HybridValueArtifact {
    let mut fields = BTreeMap::new();
    let mut rows = Vec::new();

    for (line_index, line) in content.lines().enumerate() {
        let line_number = line_index + 1;
        if let Some(metadata_line) = line.strip_prefix("# ") {
            let Some((key, value)) = metadata_line.split_once('=') else {
                return HybridValueArtifact::Malformed {
                    message: format!("line {line_number}: metadata comment is missing '='"),
                    metadata: None,
                };
            };
            if fields.insert(key.to_owned(), value.to_owned()).is_some() {
                return HybridValueArtifact::Malformed {
                    message: format!("line {line_number}: duplicate metadata key {key}"),
                    metadata: None,
                };
            }
        } else if line.trim().is_empty() {
            return HybridValueArtifact::Malformed {
                message: format!("line {line_number}: blank value rows are not allowed"),
                metadata: Some(HybridValueArtifactMetadata::new(fields, rows.len())),
            };
        } else {
            rows.push((line_number, line));
        }
    }

    let metadata = HybridValueArtifactMetadata::new(fields, rows.len());
    if metadata.field("format") != Some("rubiks_cube_solver_value_outputs_v1") {
        return HybridValueArtifact::Malformed {
            message: "missing or unsupported format metadata".to_owned(),
            metadata: Some(metadata),
        };
    }
    if metadata.field("model_type") == Some("constant_train_mean_dependency_fallback")
        || metadata.field("pytorch_available") == Some("false")
    {
        return HybridValueArtifact::DependencyFallback { metadata };
    }
    if metadata.field("model_type") != Some("pytorch_mlp")
        || metadata.field("pytorch_available") != Some("true")
    {
        return HybridValueArtifact::Malformed {
            message: "value outputs are not marked as a learned pytorch_mlp artifact".to_owned(),
            metadata: Some(metadata),
        };
    }

    let mut values = HashMap::with_capacity(rows.len());
    for (line_number, line) in rows {
        let columns = line.split('\t').collect::<Vec<_>>();
        if columns.len() != 2 {
            return HybridValueArtifact::Malformed {
                message: format!("line {line_number}: expected state<TAB>predicted_value"),
                metadata: Some(metadata),
            };
        }
        let state = match CubieState::deserialize(columns[0]) {
            Ok(state) => state,
            Err(error) => {
                return HybridValueArtifact::Malformed {
                    message: format!("line {line_number}: invalid CubieState: {error:?}"),
                    metadata: Some(metadata),
                };
            }
        };
        let predicted_value = match columns[1].parse::<f64>() {
            Ok(value) if value.is_finite() => value,
            _ => {
                return HybridValueArtifact::Malformed {
                    message: format!("line {line_number}: predicted_value must be finite"),
                    metadata: Some(metadata),
                };
            }
        };
        if values.insert(state.serialize(), predicted_value).is_some() {
            return HybridValueArtifact::Malformed {
                message: format!("line {line_number}: duplicate CubieState row"),
                metadata: Some(metadata),
            };
        }
    }

    if values.is_empty() {
        return HybridValueArtifact::Malformed {
            message: "learned value artifact contains no value rows".to_owned(),
            metadata: Some(metadata),
        };
    }

    HybridValueArtifact::Available(HybridValueTable { metadata, values })
}

fn order_moves_by_value_outputs(
    cube: &Cube,
    candidate_moves: &mut Vec<Move>,
    value_table: &HybridValueTable,
    metrics: &mut HybridMoveOrderingMetrics,
) {
    let mut scored_moves = candidate_moves
        .iter()
        .copied()
        .enumerate()
        .map(|(original_index, move_)| {
            let mut child = cube.clone();
            child.apply_move(move_);
            let score = value_table.predicted_value(child.state());
            if score.is_some() {
                metrics.scored_move_lookups += 1;
            } else {
                metrics.missing_score_lookups += 1;
            }

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

#[cfg(test)]
mod tests {
    use super::{
        load_hybrid_value_outputs, parse_hybrid_value_outputs, solve_hybrid_move_ordering,
        HybridValueArtifact, HybridValueArtifactStatus,
    };
    use crate::cube::{Cube, Move};
    use crate::search::{SearchBudget, SearchOutcome};

    #[test]
    fn missing_artifact_reports_missing_status() {
        let path = std::env::temp_dir().join(format!(
            "rubiks-cube-solver-missing-value-output-test-{}.tsv",
            std::process::id()
        ));
        let _ = std::fs::remove_file(&path);
        let artifact = load_hybrid_value_outputs(path);

        assert_eq!(artifact.status(), HybridValueArtifactStatus::Missing);
    }

    #[test]
    fn dependency_fallback_metadata_is_not_loaded_as_learned_values() {
        let artifact = parse_hybrid_value_outputs(&format!(
            "# format=rubiks_cube_solver_value_outputs_v1\n# model_type=constant_train_mean_dependency_fallback\n# pytorch_available=false\n{}\t1.0\n",
            Cube::solved().state().serialize()
        ));

        assert_eq!(
            artifact.status(),
            HybridValueArtifactStatus::DependencyFallback
        );
    }

    #[test]
    fn solved_child_score_orders_shallow_solution_first() {
        let artifact = parse_hybrid_value_outputs(&format!(
            "# format=rubiks_cube_solver_value_outputs_v1\n# model_type=pytorch_mlp\n# pytorch_available=true\n{}\t0.0\n",
            Cube::solved().state().serialize()
        ));
        let HybridValueArtifact::Available(table) = artifact else {
            panic!("test value artifact should load")
        };
        let mut cube = Cube::solved();
        cube.apply_move(Move::F);

        let result = solve_hybrid_move_ordering(&cube, SearchBudget::new(1), &table);

        match result.outcome {
            SearchOutcome::Found(solution) => assert_eq!(solution.moves(), &[Move::FPrime]),
            SearchOutcome::NotFoundWithinLimits { .. } => panic!("hybrid ordering should solve F"),
        }
        assert!(result.metrics.scored_move_lookups > 0);
        assert!(result.metrics.missing_score_lookups > 0);
    }
}
