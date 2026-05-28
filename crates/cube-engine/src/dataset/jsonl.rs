use std::fs::{self, File};
use std::io::{self, BufWriter, Write};
use std::path::Path;

use super::types::TrainingExample;

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

pub fn training_examples_to_jsonl(examples: &[TrainingExample]) -> String {
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
