use std::collections::{BTreeMap, HashMap};

use serde_json::Value;

use super::types::{
    HybridValueArtifact, HybridValueArtifactMetadata, HybridValueModel, HybridValueModelLayer,
    HybridValueSource, HybridValueTable,
};
use crate::cube::CubieState;

pub(super) fn parse_hybrid_value_outputs(content: &str) -> HybridValueArtifact {
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

pub(super) fn parse_hybrid_value_model(content: &str) -> HybridValueArtifact {
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
