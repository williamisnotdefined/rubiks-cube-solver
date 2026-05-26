use std::env;
use std::path::PathBuf;

use cube_engine::dataset::{
    generate_training_examples, write_training_examples_jsonl, DatasetGenerationConfig,
    DEFAULT_MAX_SCRAMBLE_DEPTH,
};

#[derive(Clone, Debug, Eq, PartialEq)]
struct GenerateDatasetCliConfig {
    seed: u64,
    count: usize,
    output: PathBuf,
    max_scramble_depth: usize,
}

impl Default for GenerateDatasetCliConfig {
    fn default() -> Self {
        Self {
            seed: 0,
            count: 12,
            output: PathBuf::from("datasets/generated/training.jsonl"),
            max_scramble_depth: DEFAULT_MAX_SCRAMBLE_DEPTH,
        }
    }
}

fn main() {
    if let Err(error) = run() {
        eprintln!("{error}");
        std::process::exit(1);
    }
}

fn run() -> Result<(), String> {
    let config = parse_args(env::args().skip(1))?;
    let generation_config = DatasetGenerationConfig::new(config.seed, config.count)
        .with_max_scramble_depth(config.max_scramble_depth);
    let examples =
        generate_training_examples(generation_config).map_err(|error| error.to_string())?;
    write_training_examples_jsonl(&config.output, &examples).map_err(|error| error.to_string())?;

    println!(
        "generated {} dataset examples to {} (seed={}, max_scramble_depth={})",
        examples.len(),
        config.output.display(),
        config.seed,
        config.max_scramble_depth
    );

    Ok(())
}

fn parse_args(args: impl IntoIterator<Item = String>) -> Result<GenerateDatasetCliConfig, String> {
    let mut config = GenerateDatasetCliConfig::default();
    let mut args = args.into_iter();

    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--help" | "-h" => return Err(help_text()),
            "--seed" => {
                config.seed = parse_seed("--seed", required_value("--seed", args.next())?)?;
            }
            "--count" => {
                config.count = parse_count("--count", required_value("--count", args.next())?)?;
            }
            "--output" => {
                config.output = PathBuf::from(required_value("--output", args.next())?);
            }
            "--max-scramble-depth" => {
                config.max_scramble_depth = parse_depth(
                    "--max-scramble-depth",
                    required_value("--max-scramble-depth", args.next())?,
                )?;
            }
            _ if arg.starts_with("--seed=") => {
                config.seed = parse_seed("--seed", &arg["--seed=".len()..])?;
            }
            _ if arg.starts_with("--count=") => {
                config.count = parse_count("--count", &arg["--count=".len()..])?;
            }
            _ if arg.starts_with("--output=") => {
                config.output = PathBuf::from(&arg["--output=".len()..]);
            }
            _ if arg.starts_with("--max-scramble-depth=") => {
                config.max_scramble_depth = parse_depth(
                    "--max-scramble-depth",
                    &arg["--max-scramble-depth=".len()..],
                )?;
            }
            _ => return Err(format!("unknown argument: {arg}\n{}", help_text())),
        }
    }

    Ok(config)
}

fn required_value(flag: &str, value: Option<String>) -> Result<String, String> {
    value.ok_or_else(|| format!("{flag} requires a value"))
}

fn parse_seed(flag: &str, value: impl AsRef<str>) -> Result<u64, String> {
    let value = value.as_ref();

    value
        .parse::<u64>()
        .map_err(|_| format!("{flag} must be an unsigned 64-bit integer, got {value}"))
}

fn parse_count(flag: &str, value: impl AsRef<str>) -> Result<usize, String> {
    let value = value.as_ref();
    let count = value
        .parse::<usize>()
        .map_err(|_| format!("{flag} must be a non-negative integer, got {value}"))?;

    if count == 0 {
        return Err(format!("{flag} must be greater than zero"));
    }

    Ok(count)
}

fn parse_depth(flag: &str, value: impl AsRef<str>) -> Result<usize, String> {
    let value = value.as_ref();

    value
        .parse::<usize>()
        .map_err(|_| format!("{flag} must be a non-negative integer, got {value}"))
}

fn help_text() -> String {
    "usage: generate_dataset [--seed N] [--count N] [--output FILE] [--max-scramble-depth N]\n\nGenerates deterministic JSONL training examples from engine-produced scrambles. Defaults: seed=0, count=12, output=datasets/generated/training.jsonl, max_scramble_depth=12."
        .to_owned()
}

#[cfg(test)]
mod tests {
    use super::{parse_args, GenerateDatasetCliConfig};
    use cube_engine::dataset::DEFAULT_MAX_SCRAMBLE_DEPTH;
    use std::path::PathBuf;

    #[test]
    fn parse_args_uses_documented_defaults() {
        assert_eq!(
            parse_args([]).expect("defaults should parse"),
            GenerateDatasetCliConfig {
                seed: 0,
                count: 12,
                output: PathBuf::from("datasets/generated/training.jsonl"),
                max_scramble_depth: DEFAULT_MAX_SCRAMBLE_DEPTH,
            }
        );
    }

    #[test]
    fn parse_args_accepts_seed_count_output_and_depth() {
        let config = parse_args([
            "--seed=9".to_owned(),
            "--count".to_owned(),
            "25".to_owned(),
            "--output".to_owned(),
            "datasets/fixtures/custom.jsonl".to_owned(),
            "--max-scramble-depth=18".to_owned(),
        ])
        .expect("explicit args should parse");

        assert_eq!(config.seed, 9);
        assert_eq!(config.count, 25);
        assert_eq!(
            config.output,
            PathBuf::from("datasets/fixtures/custom.jsonl")
        );
        assert_eq!(config.max_scramble_depth, 18);
    }

    #[test]
    fn parse_args_rejects_zero_count() {
        let error = parse_args(["--count=0".to_owned()])
            .expect_err("zero count should not be accepted by the CLI");

        assert!(error.contains("--count must be greater than zero"));
    }
}
