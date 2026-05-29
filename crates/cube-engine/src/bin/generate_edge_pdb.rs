use std::env;
use std::path::PathBuf;
use std::time::Instant;

use cube_engine::search::edge_pdb::{
    edge_pattern_database_path, EdgePatternDatabase, EdgePatternDatabaseId,
};
use cube_engine::search::pruning::DEFAULT_PRUNING_TABLE_DIR;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum PatternSelection {
    All,
    Single(EdgePatternDatabaseId),
}

#[derive(Clone, Debug, Eq, PartialEq)]
struct GenerateConfig {
    output_dir: PathBuf,
    max_depth: u8,
    pattern: PatternSelection,
}

impl Default for GenerateConfig {
    fn default() -> Self {
        Self {
            output_dir: PathBuf::from(DEFAULT_PRUNING_TABLE_DIR),
            max_depth: 6,
            pattern: PatternSelection::All,
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
    std::fs::create_dir_all(&config.output_dir).map_err(|error| {
        format!(
            "could not create edge pattern database directory {}: {error}",
            config.output_dir.display()
        )
    })?;

    for id in selected_patterns(config.pattern) {
        let started = Instant::now();
        let database = EdgePatternDatabase::generate(id, config.max_depth)
            .map_err(|error| error.to_string())?;
        let output = edge_pattern_database_path(&config.output_dir, id);
        database
            .save_artifact(&output)
            .map_err(|error| error.to_string())?;

        println!(
            "generated edge pattern database {} (pattern={:?}, max_depth={}, entries={}, elapsed_ms={})",
            output.display(),
            database.id(),
            database.max_depth(),
            database.entry_count(),
            started.elapsed().as_millis()
        );
    }

    Ok(())
}

fn selected_patterns(selection: PatternSelection) -> Vec<EdgePatternDatabaseId> {
    match selection {
        PatternSelection::All => EdgePatternDatabaseId::ALL.to_vec(),
        PatternSelection::Single(id) => vec![id],
    }
}

fn parse_args(args: impl IntoIterator<Item = String>) -> Result<GenerateConfig, String> {
    let mut config = GenerateConfig::default();
    let mut args = args.into_iter();

    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--help" | "-h" => return Err(help_text()),
            "--output-dir" => {
                config.output_dir = PathBuf::from(required_value("--output-dir", args.next())?);
            }
            "--max-depth" => {
                config.max_depth =
                    parse_depth("--max-depth", required_value("--max-depth", args.next())?)?;
            }
            "--pattern" => {
                config.pattern =
                    parse_pattern("--pattern", required_value("--pattern", args.next())?)?;
            }
            _ if arg.starts_with("--output-dir=") => {
                config.output_dir = PathBuf::from(&arg["--output-dir=".len()..]);
            }
            _ if arg.starts_with("--max-depth=") => {
                config.max_depth = parse_depth("--max-depth", &arg["--max-depth=".len()..])?;
            }
            _ if arg.starts_with("--pattern=") => {
                config.pattern = parse_pattern("--pattern", &arg["--pattern=".len()..])?;
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

fn parse_pattern(flag: &str, value: impl AsRef<str>) -> Result<PatternSelection, String> {
    match value.as_ref() {
        "all" => Ok(PatternSelection::All),
        "a" | "A" => Ok(PatternSelection::Single(EdgePatternDatabaseId::A)),
        "b" | "B" => Ok(PatternSelection::Single(EdgePatternDatabaseId::B)),
        value => Err(format!("{flag} must be one of all, a, or b, got {value}")),
    }
}

fn help_text() -> String {
    "usage: generate_edge_pdb [--output-dir DIR] [--max-depth N] [--pattern all|a|b]\n\nDefault output directory is crates/cube-engine/pruning-tables. The command writes dense local 6-edge pattern database artifacts for admissible <=16 IDA* attempts. Generated artifacts are local solver assets and should not be committed."
        .to_owned()
}

#[cfg(test)]
mod tests {
    use super::{parse_args, EdgePatternDatabaseId, GenerateConfig, PatternSelection};
    use std::path::PathBuf;

    #[test]
    fn parse_args_uses_safe_defaults() {
        assert_eq!(
            parse_args([]).expect("defaults should parse"),
            GenerateConfig::default()
        );
    }

    #[test]
    fn parse_args_accepts_output_depth_and_pattern() {
        let config = parse_args([
            "--output-dir".to_owned(),
            "tmp/edge-pdb".to_owned(),
            "--max-depth=8".to_owned(),
            "--pattern=b".to_owned(),
        ])
        .expect("explicit args should parse");

        assert_eq!(config.output_dir, PathBuf::from("tmp/edge-pdb"));
        assert_eq!(config.max_depth, 8);
        assert_eq!(
            config.pattern,
            PatternSelection::Single(EdgePatternDatabaseId::B)
        );
    }
}
