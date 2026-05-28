use std::collections::{BTreeMap, HashMap};

use crate::cube::CubieState;
use crate::search::solution::SearchOutcome;

use super::encoding::encode_cubie_state;

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
    pub(super) fn new(fields: BTreeMap<String, String>, value_rows: usize) -> Self {
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

    pub(super) fn field(&self, key: &str) -> Option<&str> {
        self.fields.get(key).map(String::as_str)
    }
}

#[derive(Clone, Debug)]
pub(crate) struct HybridValueTable {
    pub(super) metadata: HybridValueArtifactMetadata,
    pub(super) values: HashMap<String, f64>,
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
    pub(super) metadata: HybridValueArtifactMetadata,
    pub(super) layers: Vec<HybridValueModelLayer>,
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
pub(super) enum HybridValueModelLayer {
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

    pub(super) fn predicted_value(&self, state: &CubieState) -> HybridValuePrediction {
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
pub(super) enum HybridValuePrediction {
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
