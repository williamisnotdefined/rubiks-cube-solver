use std::env;
use std::path::PathBuf;
use std::time::Instant;

use cube_engine::search::corner_pdb::{corner_pattern_database_path, CornerPatternDatabase};
use cube_engine::search::pruning::DEFAULT_PRUNING_TABLE_DIR;

#[derive(Clone, Debug, Eq, PartialEq)]
struct GenerateConfig {
    output: PathBuf,
    max_depth: u8,
}

impl Default for GenerateConfig {
    fn default() -> Self {
        Self {
            output: corner_pattern_database_path(&PathBuf::from(DEFAULT_PRUNING_TABLE_DIR)),
            max_depth: 6,
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
    let started = Instant::now();
    let database =
        CornerPatternDatabase::generate(config.max_depth).map_err(|error| error.to_string())?;

    if let Some(parent) = config.output.parent() {
        std::fs::create_dir_all(parent).map_err(|error| {
            format!(
                "could not create corner pattern database directory {}: {error}",
                parent.display()
            )
        })?;
    }

    database
        .save_artifact(&config.output)
        .map_err(|error| error.to_string())?;

    println!(
        "generated corner pattern database {} (max_depth={}, entries={}, elapsed_ms={})",
        config.output.display(),
        database.max_depth(),
        database.entry_count(),
        started.elapsed().as_millis()
    );

    Ok(())
}

fn parse_args(args: impl IntoIterator<Item = String>) -> Result<GenerateConfig, String> {
    let mut config = GenerateConfig::default();
    let mut args = args.into_iter();

    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--help" | "-h" => return Err(help_text()),
            "--output" => {
                config.output = PathBuf::from(required_value("--output", args.next())?);
            }
            "--max-depth" => {
                config.max_depth =
                    parse_depth("--max-depth", required_value("--max-depth", args.next())?)?;
            }
            _ if arg.starts_with("--output=") => {
                config.output = PathBuf::from(&arg["--output=".len()..]);
            }
            _ if arg.starts_with("--max-depth=") => {
                config.max_depth = parse_depth("--max-depth", &arg["--max-depth=".len()..])?;
            }
            _ => return Err(format!("unknown argument: {arg}\n{}", help_text())),
        }
    }

    Ok(config)
}

fn required_value(flag: &str, value: Option<String>) -> Result<String, String> {
    value.ok_or_else(|| format!("{flag} requires a value"))
}

fn parse_depth(flag: &str, value: impl AsRef<str>) -> Result<u8, String> {
    let value = value.as_ref();
    let depth = value
        .parse::<u8>()
        .map_err(|_| format!("{flag} must be an integer in 0..255, got {value}"))?;

    if depth == u8::MAX {
        return Err(format!(
            "{flag} must be below 255 because 255 marks unreached table entries"
        ));
    }

    Ok(depth)
}

fn help_text() -> String {
    "usage: generate_corner_pdb [--output FILE] [--max-depth N]\n\nDefault output is crates/cube-engine/pruning-tables/corner-pattern-database.rpdb. The artifact is a dense server-side corner permutation+orientation pattern database. Use a shallow depth such as 6 for smoke checks; deeper values use substantially more CPU and memory but give stronger admissible lower bounds."
        .to_owned()
}

#[cfg(test)]
mod tests {
    use super::{parse_args, GenerateConfig};
    use std::path::PathBuf;

    #[test]
    fn parse_args_uses_safe_defaults() {
        assert_eq!(
            parse_args([]).expect("defaults should parse"),
            GenerateConfig::default()
        );
    }

    #[test]
    fn parse_args_accepts_output_and_depth() {
        let config = parse_args([
            "--output".to_owned(),
            "tmp/corner.rpdb".to_owned(),
            "--max-depth=8".to_owned(),
        ])
        .expect("explicit args should parse");

        assert_eq!(config.output, PathBuf::from("tmp/corner.rpdb"));
        assert_eq!(config.max_depth, 8);
    }
}
