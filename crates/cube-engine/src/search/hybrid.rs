use std::cmp::Ordering;
use std::collections::{BTreeMap, HashMap};
use std::fs;
use std::io;
use std::path::Path;

use serde_json::Value;

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
pub(crate) struct HybridValueModel {
    metadata: HybridValueArtifactMetadata,
    layers: Vec<HybridValueModelLayer>,
}

impl HybridValueModel {
    fn metadata(&self) -> &HybridValueArtifactMetadata {
        &self.metadata
    }

    fn predicted_value(&self, state: &CubieState) -> f64 {
        let mut activations = encode_cubie_state(state);
        for layer in &self.layers {
            match layer {
                HybridValueModelLayer::Linear { weight, bias } => {
                    activations = weight
                        .iter()
                        .zip(bias.iter())
                        .map(|(row, bias)| {
                            row.iter()
                                .zip(activations.iter())
                                .map(|(weight, activation)| weight * activation)
                                .sum::<f64>()
                                + bias
                        })
                        .collect();
                }
                HybridValueModelLayer::Relu => {
                    for value in &mut activations {
                        *value = value.max(0.0);
                    }
                }
            }
        }

        activations[0]
    }
}

#[derive(Clone, Debug)]
enum HybridValueModelLayer {
    Linear {
        weight: Vec<Vec<f64>>,
        bias: Vec<f64>,
    },
    Relu,
}

#[derive(Clone, Debug)]
pub(crate) enum HybridValueSource {
    Table(HybridValueTable),
    Model(HybridValueModel),
}

impl HybridValueSource {
    fn metadata(&self) -> &HybridValueArtifactMetadata {
        match self {
            Self::Table(table) => table.metadata(),
            Self::Model(model) => model.metadata(),
        }
    }

    fn predicted_value(&self, state: &CubieState) -> HybridValuePrediction {
        match self {
            Self::Table(table) => {
                table
                    .predicted_value(state)
                    .map_or(HybridValuePrediction::Missing, |value| {
                        HybridValuePrediction::Scored {
                            value,
                            model_eval: false,
                        }
                    })
            }
            Self::Model(model) => HybridValuePrediction::Scored {
                value: model.predicted_value(state),
                model_eval: true,
            },
        }
    }
}

#[derive(Clone, Copy, Debug)]
enum HybridValuePrediction {
    Scored { value: f64, model_eval: bool },
    Missing,
}

#[derive(Clone, Debug)]
pub(crate) enum HybridValueArtifact {
    Available(HybridValueSource),
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
            Self::Available(source) => Some(source.metadata().summary_label()),
            Self::DependencyFallback { metadata } => Some(metadata.summary_label()),
            Self::Malformed {
                message,
                metadata: Some(metadata),
            } => Some(format!("{};error={}", metadata.summary_label(), message)),
            Self::Malformed { message, .. } => Some(format!("error={message}")),
            Self::Missing { message } => Some(message.clone()),
        }
    }

    pub(crate) fn is_model(&self) -> bool {
        matches!(self, Self::Available(HybridValueSource::Model(_)))
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub(crate) struct HybridMoveOrderingMetrics {
    pub(crate) scored_move_lookups: usize,
    pub(crate) missing_score_lookups: usize,
    pub(crate) model_score_evals: usize,
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

pub(crate) fn load_hybrid_value_model(path: impl AsRef<Path>) -> HybridValueArtifact {
    match fs::read_to_string(path.as_ref()) {
        Ok(content) => parse_hybrid_value_model(&content),
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

    HybridValueArtifact::Available(HybridValueSource::Table(HybridValueTable {
        metadata,
        values,
    }))
}

fn parse_hybrid_value_model(content: &str) -> HybridValueArtifact {
    let root = match serde_json::from_str::<Value>(content) {
        Ok(root) => root,
        Err(error) => {
            return HybridValueArtifact::Malformed {
                message: format!("invalid JSON: {error}"),
                metadata: None,
            };
        }
    };
    let metadata = model_metadata_from_json(&root);

    match hybrid_value_model_from_json(&root, metadata.clone()) {
        Ok(model) => HybridValueArtifact::Available(HybridValueSource::Model(model)),
        Err(message) => HybridValueArtifact::Malformed {
            message,
            metadata: Some(metadata),
        },
    }
}

fn model_metadata_from_json(root: &Value) -> HybridValueArtifactMetadata {
    let mut fields = BTreeMap::new();
    if let Some(object) = root.as_object() {
        for key in [
            "format",
            "model_type",
            "pytorch_available",
            "examples",
            "label_target",
            "label_source",
            "feature_dim",
            "hidden_dim",
        ] {
            if let Some(value) = object.get(key).and_then(json_scalar_label) {
                fields.insert(key.to_owned(), value);
            }
        }
    }

    HybridValueArtifactMetadata::new(fields, 0)
}

fn json_scalar_label(value: &Value) -> Option<String> {
    match value {
        Value::Bool(value) => Some(value.to_string()),
        Value::Number(value) => Some(value.to_string()),
        Value::String(value) => Some(value.clone()),
        Value::Null | Value::Array(_) | Value::Object(_) => None,
    }
}

fn hybrid_value_model_from_json(
    root: &Value,
    metadata: HybridValueArtifactMetadata,
) -> Result<HybridValueModel, String> {
    let object = root
        .as_object()
        .ok_or_else(|| "model artifact root must be a JSON object".to_owned())?;

    require_string(object, "format").and_then(|format| {
        if format == "rubiks_cube_solver_value_model_v1" {
            Ok(())
        } else {
            Err(format!("unsupported model format {format}"))
        }
    })?;
    require_string(object, "model_type").and_then(|model_type| {
        if model_type == "pytorch_mlp" {
            Ok(())
        } else {
            Err(format!("unsupported model_type {model_type}"))
        }
    })?;
    if !require_bool(object, "pytorch_available")? {
        return Err("model artifact is not marked as pytorch_available=true".to_owned());
    }
    let feature_dim = require_usize(object, "feature_dim")?;
    if feature_dim != 40 {
        return Err(format!("feature_dim must be 40, got {feature_dim}"));
    }

    let layer_values = object
        .get("layers")
        .and_then(Value::as_array)
        .ok_or_else(|| "layers must be an array".to_owned())?;
    let mut layers = Vec::with_capacity(layer_values.len());
    let mut input_dim = feature_dim;
    for (index, layer_value) in layer_values.iter().enumerate() {
        let layer_object = layer_value
            .as_object()
            .ok_or_else(|| format!("layer {index} must be an object"))?;
        match require_string(layer_object, "type")?.as_str() {
            "linear" => {
                let weight = require_matrix(layer_object, "weight")?;
                let bias = require_vector(layer_object, "bias")?;
                if weight.is_empty() {
                    return Err(format!("layer {index} weight must not be empty"));
                }
                if weight.len() != bias.len() {
                    return Err(format!(
                        "layer {index} weight rows ({}) must match bias length ({})",
                        weight.len(),
                        bias.len()
                    ));
                }
                if weight.iter().any(|row| row.len() != input_dim) {
                    return Err(format!(
                        "layer {index} weight rows must have input dimension {input_dim}"
                    ));
                }
                input_dim = bias.len();
                layers.push(HybridValueModelLayer::Linear { weight, bias });
            }
            "relu" => layers.push(HybridValueModelLayer::Relu),
            layer_type => return Err(format!("unsupported layer {index} type {layer_type}")),
        }
    }

    if input_dim != 1 {
        return Err(format!("model output dimension must be 1, got {input_dim}"));
    }

    Ok(HybridValueModel { metadata, layers })
}

fn require_string(object: &serde_json::Map<String, Value>, key: &str) -> Result<String, String> {
    object
        .get(key)
        .and_then(Value::as_str)
        .map(str::to_owned)
        .ok_or_else(|| format!("{key} must be a string"))
}

fn require_bool(object: &serde_json::Map<String, Value>, key: &str) -> Result<bool, String> {
    object
        .get(key)
        .and_then(Value::as_bool)
        .ok_or_else(|| format!("{key} must be a boolean"))
}

fn require_usize(object: &serde_json::Map<String, Value>, key: &str) -> Result<usize, String> {
    let value = object
        .get(key)
        .and_then(Value::as_u64)
        .ok_or_else(|| format!("{key} must be a non-negative integer"))?;
    usize::try_from(value).map_err(|_| format!("{key} is too large"))
}

fn require_matrix(
    object: &serde_json::Map<String, Value>,
    key: &str,
) -> Result<Vec<Vec<f64>>, String> {
    object
        .get(key)
        .and_then(Value::as_array)
        .ok_or_else(|| format!("{key} must be an array"))?
        .iter()
        .enumerate()
        .map(|(row_index, row)| {
            row.as_array()
                .ok_or_else(|| format!("{key}[{row_index}] must be an array"))?
                .iter()
                .enumerate()
                .map(|(column_index, value)| {
                    value
                        .as_f64()
                        .filter(|value| value.is_finite())
                        .ok_or_else(|| {
                            format!("{key}[{row_index}][{column_index}] must be a finite number")
                        })
                })
                .collect()
        })
        .collect()
}

fn require_vector(object: &serde_json::Map<String, Value>, key: &str) -> Result<Vec<f64>, String> {
    object
        .get(key)
        .and_then(Value::as_array)
        .ok_or_else(|| format!("{key} must be an array"))?
        .iter()
        .enumerate()
        .map(|(index, value)| {
            value
                .as_f64()
                .filter(|value| value.is_finite())
                .ok_or_else(|| format!("{key}[{index}] must be a finite number"))
        })
        .collect()
}

fn encode_cubie_state(state: &CubieState) -> Vec<f64> {
    let mut features = Vec::with_capacity(40);
    features.extend(
        state
            .corner_permutation
            .iter()
            .map(|corner| corner.index() as f64 / 7.0),
    );
    features.extend(
        state
            .corner_orientation
            .iter()
            .map(|orientation| f64::from(*orientation) / 2.0),
    );
    features.extend(
        state
            .edge_permutation
            .iter()
            .map(|edge| edge.index() as f64 / 11.0),
    );
    features.extend(
        state
            .edge_orientation
            .iter()
            .map(|orientation| f64::from(*orientation)),
    );
    debug_assert_eq!(features.len(), 40);

    features
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

#[cfg(test)]
mod tests {
    use super::{
        load_hybrid_value_outputs, parse_hybrid_value_model, parse_hybrid_value_outputs,
        solve_hybrid_move_ordering, HybridValueArtifact, HybridValueArtifactStatus,
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
        let HybridValueArtifact::Available(source) = artifact else {
            panic!("test value artifact should load")
        };
        let mut cube = Cube::solved();
        cube.apply_move(Move::F);

        let result = solve_hybrid_move_ordering(&cube, SearchBudget::new(1), &source);

        match result.outcome {
            SearchOutcome::Found(solution) => assert_eq!(solution.moves(), &[Move::FPrime]),
            SearchOutcome::NotFoundWithinLimits { .. } => panic!("hybrid ordering should solve F"),
        }
        assert!(result.metrics.scored_move_lookups > 0);
        assert!(result.metrics.missing_score_lookups > 0);
    }

    #[test]
    fn value_model_scores_all_child_states_without_lookup_misses() {
        let artifact = parse_hybrid_value_model(&format!(
            r#"{{
                "format":"rubiks_cube_solver_value_model_v1",
                "model_type":"pytorch_mlp",
                "pytorch_available":true,
                "examples":1,
                "label_target":"verified_solution_length",
                "label_source":"generated_two_phase_quality_solver_replay_verified",
                "feature_dim":40,
                "hidden_dim":1,
                "layers":[{{"type":"linear","weight":[[{}]],"bias":[1.25]}}]
            }}"#,
            vec!["0.0"; 40].join(",")
        ));
        let HybridValueArtifact::Available(source) = artifact else {
            panic!("test model artifact should load")
        };
        let mut cube = Cube::solved();
        cube.apply_move(Move::F);

        let result = solve_hybrid_move_ordering(&cube, SearchBudget::new(1), &source);

        match result.outcome {
            SearchOutcome::Found(solution) => assert_eq!(solution.moves(), &[Move::FPrime]),
            SearchOutcome::NotFoundWithinLimits { .. } => panic!("model ordering should solve F"),
        }
        assert!(result.metrics.scored_move_lookups > 0);
        assert_eq!(result.metrics.missing_score_lookups, 0);
        assert_eq!(
            result.metrics.model_score_evals,
            result.metrics.scored_move_lookups
        );
    }
}
