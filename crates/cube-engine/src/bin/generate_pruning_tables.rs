use std::env;
use std::path::PathBuf;

use cube_engine::search::pruning::{generate_all_pruning_tables, DEFAULT_PRUNING_TABLE_DIR};

#[derive(Clone, Debug, Eq, PartialEq)]
struct GenerateConfig {
    output: PathBuf,
    phase1_max_depth: u8,
    phase2_max_depth: u8,
}

impl Default for GenerateConfig {
    fn default() -> Self {
        Self {
            output: PathBuf::from(DEFAULT_PRUNING_TABLE_DIR),
            phase1_max_depth: 2,
            phase2_max_depth: 2,
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
    let paths = generate_all_pruning_tables(
        &config.output,
        config.phase1_max_depth,
        config.phase2_max_depth,
    )
    .map_err(|error| error.to_string())?;

    println!(
        "generated {} compact pruning-table artifacts under {} (phase1_depth={}, phase2_depth={})",
        paths.len(),
        config.output.display(),
        config.phase1_max_depth,
        config.phase2_max_depth
    );
    for path in paths {
        println!("{}", path.display());
    }

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
                let depth =
                    parse_depth("--max-depth", required_value("--max-depth", args.next())?)?;
                config.phase1_max_depth = depth;
                config.phase2_max_depth = depth;
            }
            "--phase1-max-depth" => {
                config.phase1_max_depth = parse_depth(
                    "--phase1-max-depth",
                    required_value("--phase1-max-depth", args.next())?,
                )?;
            }
            "--phase2-max-depth" => {
                config.phase2_max_depth = parse_depth(
                    "--phase2-max-depth",
                    required_value("--phase2-max-depth", args.next())?,
                )?;
            }
            _ if arg.starts_with("--output=") => {
                config.output = PathBuf::from(&arg["--output=".len()..]);
            }
            _ if arg.starts_with("--max-depth=") => {
                let depth = parse_depth("--max-depth", &arg["--max-depth=".len()..])?;
                config.phase1_max_depth = depth;
                config.phase2_max_depth = depth;
            }
            _ if arg.starts_with("--phase1-max-depth=") => {
                config.phase1_max_depth =
                    parse_depth("--phase1-max-depth", &arg["--phase1-max-depth=".len()..])?;
            }
            _ if arg.starts_with("--phase2-max-depth=") => {
                config.phase2_max_depth =
                    parse_depth("--phase2-max-depth", &arg["--phase2-max-depth=".len()..])?;
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
            "{flag} must be below 255 because 255 marks unreachable table entries"
        ));
    }

    Ok(depth)
}

fn help_text() -> String {
    "usage: generate_pruning_tables [--output DIR] [--max-depth N] [--phase1-max-depth N] [--phase2-max-depth N]\n\nDefault output is crates/cube-engine/pruning-tables. Use --output apps/web/public/generated-pruning-tables --max-depth 6 for browser-served local artifacts. Use --output /tmp/rubiks-cube-solver-pruning-tables --max-depth 8 for native solver quality reports. Artifacts are compact depth-limited files that store only reached pruning entries plus deterministic generation metadata; regenerate old local artifacts after format changes or depth changes. Defaults generate depth-2 deterministic artifacts for fast local smoke checks; raise depths explicitly for deeper local tables."
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
    fn parse_args_accepts_output_and_depths() {
        let config = parse_args([
            "--output".to_owned(),
            "tmp/tables".to_owned(),
            "--phase1-max-depth=3".to_owned(),
            "--phase2-max-depth".to_owned(),
            "4".to_owned(),
        ])
        .expect("explicit args should parse");

        assert_eq!(config.output, PathBuf::from("tmp/tables"));
        assert_eq!(config.phase1_max_depth, 3);
        assert_eq!(config.phase2_max_depth, 4);
    }
}
