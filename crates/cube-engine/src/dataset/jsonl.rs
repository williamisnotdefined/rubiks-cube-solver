use std::fs::{self, File};
use std::io::{self, BufWriter, Write};
use std::path::Path;

use super::types::{TrainingExample, TrainingExampleV2};

impl TrainingExample {
    pub fn to_json_line(&self) -> String {
        let mut output = String::new();

        output.push_str("{\"schema_version\":");
        output.push_str(&self.schema_version.to_string());
        output.push_str(",\"state\":");
        push_json_string(&mut output, &self.state);
        output.push_str(",\"scramble\":");
        push_json_string(&mut output, &self.scramble);
        output.push_str(",\"scramble_depth\":");
        output.push_str(&self.scramble_depth.to_string());
        output.push_str(",\"verified_solution\":");
        push_json_string(&mut output, &self.verified_solution);
        output.push_str(",\"verified_solution_length\":");
        output.push_str(&self.verified_solution_length.to_string());
        output.push_str(",\"best_move\":");
        if let Some(best_move) = self.best_move {
            push_json_string(&mut output, best_move.notation());
        } else {
            output.push_str("null");
        }
        output.push_str(",\"label_source\":");
        push_json_string(&mut output, self.label_source);
        output.push_str(",\"split\":");
        push_json_string(&mut output, self.split.label());
        output.push('}');

        output
    }
}

impl TrainingExampleV2 {
    pub fn to_json_line(&self) -> String {
        let mut output = String::new();

        output.push_str("{\"schema_version\":");
        output.push_str(&self.schema_version.to_string());
        output.push_str(",\"puzzle_id\":");
        push_json_string(&mut output, self.puzzle_id);
        output.push_str(",\"puzzle_slug\":");
        push_json_string(&mut output, self.puzzle_slug);
        output.push_str(",\"state_encoding_id\":");
        push_json_string(&mut output, self.state_encoding_id);
        output.push_str(",\"move_set_id\":");
        push_json_string(&mut output, self.move_set_id);
        output.push_str(",\"metric\":");
        push_json_string(&mut output, self.metric);
        output.push_str(",\"state\":");
        push_json_string(&mut output, &self.state);
        output.push_str(",\"scramble\":");
        push_json_string(&mut output, &self.scramble);
        output.push_str(",\"scramble_depth\":");
        output.push_str(&self.scramble_depth.to_string());
        output.push_str(",\"verified_solution\":");
        push_json_string(&mut output, &self.verified_solution);
        output.push_str(",\"verified_solution_length\":");
        output.push_str(&self.verified_solution_length.to_string());
        output.push_str(",\"best_move\":");
        if let Some(best_move) = &self.best_move {
            push_json_string(&mut output, best_move);
        } else {
            output.push_str("null");
        }
        output.push_str(",\"label_source\":");
        push_json_string(&mut output, self.label_source);
        output.push_str(",\"label_target\":");
        push_json_string(&mut output, self.label_target);
        output.push_str(",\"split\":");
        push_json_string(&mut output, self.split.label());
        output.push_str(",\"generator_seed\":");
        output.push_str(&self.generator_seed.to_string());
        output.push_str(",\"solver_strategy_id\":");
        push_json_string(&mut output, self.solver_strategy_id);
        output.push_str(",\"replay_verified\":");
        output.push_str(if self.replay_verified {
            "true"
        } else {
            "false"
        });
        output.push('}');

        output
    }
}

pub fn training_examples_to_jsonl(examples: &[TrainingExample]) -> String {
    let mut output = String::new();

    for example in examples {
        output.push_str(&example.to_json_line());
        output.push('\n');
    }

    output
}

pub fn training_examples_v2_to_jsonl(examples: &[TrainingExampleV2]) -> String {
    let mut output = String::new();

    for example in examples {
        output.push_str(&example.to_json_line());
        output.push('\n');
    }

    output
}

pub fn write_training_examples_jsonl(
    path: impl AsRef<Path>,
    examples: &[TrainingExample],
) -> io::Result<()> {
    let path = path.as_ref();
    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent)?;
        }
    }

    let file = File::create(path)?;
    let mut writer = BufWriter::new(file);

    for example in examples {
        writeln!(writer, "{}", example.to_json_line())?;
    }

    writer.flush()
}

pub fn write_training_examples_v2_jsonl(
    path: impl AsRef<Path>,
    examples: &[TrainingExampleV2],
) -> io::Result<()> {
    let path = path.as_ref();
    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent)?;
        }
    }

    let file = File::create(path)?;
    let mut writer = BufWriter::new(file);

    for example in examples {
        writeln!(writer, "{}", example.to_json_line())?;
    }

    writer.flush()
}

fn push_json_string(output: &mut String, value: &str) {
    output.push('"');

    for character in value.chars() {
        match character {
            '"' => output.push_str("\\\""),
            '\\' => output.push_str("\\\\"),
            '\n' => output.push_str("\\n"),
            '\r' => output.push_str("\\r"),
            '\t' => output.push_str("\\t"),
            character if character.is_control() => {
                output.push_str(&format!("\\u{:04x}", character as u32));
            }
            character => output.push(character),
        }
    }

    output.push('"');
}

#[cfg(test)]
mod tests {
    use serde_json::Value;

    use super::{training_examples_to_jsonl, training_examples_v2_to_jsonl};
    use crate::cube::Move;
    use crate::dataset::{
        DatasetSplit, TrainingExample, TrainingExampleV2, CUBE2_DATASET_COMPATIBILITY,
        CUBE2_PDB_VERIFIED_LABEL_SOURCE, DATASET_SCHEMA_VERSION, DATASET_SCHEMA_VERSION_V2,
    };
    use crate::puzzles::cube2::CUBE2_PDB_IDA_STAR_STRATEGY_ID;

    #[test]
    fn legacy_training_example_jsonl_keeps_schema_v1_field_order() {
        let example = TrainingExample {
            schema_version: DATASET_SCHEMA_VERSION,
            state: "cp=0;co=0;ep=0;eo=0".to_owned(),
            scramble: "R".to_owned(),
            scramble_depth: 1,
            verified_solution: "R'".to_owned(),
            verified_solution_length: 1,
            best_move: Some(Move::RPrime),
            label_source: "reversible_scramble_inverse_replay_verified",
            split: DatasetSplit::Train,
        };

        let jsonl = training_examples_to_jsonl(&[example]);

        assert_eq!(
            jsonl,
            "{\"schema_version\":1,\"state\":\"cp=0;co=0;ep=0;eo=0\",\"scramble\":\"R\",\"scramble_depth\":1,\"verified_solution\":\"R'\",\"verified_solution_length\":1,\"best_move\":\"R'\",\"label_source\":\"reversible_scramble_inverse_replay_verified\",\"split\":\"train\"}\n"
        );
    }

    #[test]
    fn training_example_v2_jsonl_includes_puzzle_compatibility_fields() {
        let example = TrainingExampleV2::from_compatibility(
            CUBE2_DATASET_COMPATIBILITY,
            "cp=0,1,2,3,4,5,6,7;co=0,0,0,0,0,0,0,0".to_owned(),
            "R".to_owned(),
            1,
            "R'".to_owned(),
            1,
            Some("R'".to_owned()),
            CUBE2_PDB_VERIFIED_LABEL_SOURCE,
            0,
            CUBE2_PDB_IDA_STAR_STRATEGY_ID,
            true,
        );

        let jsonl = training_examples_v2_to_jsonl(&[example]);
        let value = serde_json::from_str::<Value>(jsonl.trim()).expect("valid v2 json row");

        assert_eq!(value["schema_version"], DATASET_SCHEMA_VERSION_V2);
        assert_eq!(value["puzzle_id"], CUBE2_DATASET_COMPATIBILITY.puzzle_id);
        assert_eq!(
            value["puzzle_slug"],
            CUBE2_DATASET_COMPATIBILITY.puzzle_slug
        );
        assert_eq!(
            value["state_encoding_id"],
            CUBE2_DATASET_COMPATIBILITY.state_encoding_id
        );
        assert_eq!(
            value["move_set_id"],
            CUBE2_DATASET_COMPATIBILITY.move_set_id
        );
        assert_eq!(value["metric"], CUBE2_DATASET_COMPATIBILITY.metric);
        assert_eq!(value["label_target"], "verified_solution_length");
        assert_eq!(value["solver_strategy_id"], CUBE2_PDB_IDA_STAR_STRATEGY_ID);
        assert_eq!(value["replay_verified"], true);
    }
}
