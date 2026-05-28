use std::fs;
use std::io;
use std::path::Path;

use super::parser::{parse_hybrid_value_model, parse_hybrid_value_outputs};
use super::types::HybridValueArtifact;

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
