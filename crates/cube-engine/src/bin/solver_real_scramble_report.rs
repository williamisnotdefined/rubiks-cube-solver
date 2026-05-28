use std::path::PathBuf;
use std::process::ExitCode;

use cube_engine::solver::benchmark::run_real_scramble_benchmark;
use cube_engine::{RealScrambleBenchmarkStatus, SolverConfig, SolverStrategy};

#[derive(Clone, Debug, Eq, PartialEq)]
struct BenchmarkConfig {
    strategy: SolverStrategy,
    max_depth: usize,
    max_nodes: Option<usize>,
    pruning_table_dir: Option<PathBuf>,
    require_success: bool,
    require_max_solution_len: Option<usize>,
}

impl Default for BenchmarkConfig {
    fn default() -> Self {
        Self {
            strategy: SolverStrategy::GeneratedTwoPhase,
            max_depth: 30,
            max_nodes: Some(1_000),
            pruning_table_dir: None,
            require_success: false,
            require_max_solution_len: None,
        }
    }
}

fn main() -> ExitCode {
    let config = match parse_args(std::env::args().skip(1)) {
        Ok(config) => config,
        Err(message) => {
            eprintln!("{message}");
            return ExitCode::FAILURE;
        }
    };
    let require_success = config.require_success;
    let require_max_solution_len = config.require_max_solution_len;
    let solver_config = solver_config(config);

    match run_real_scramble_benchmark(solver_config) {
        Ok(report) => {
            print!("{}", report.to_markdown());
            if require_success && !all_rows_succeeded(&report) {
                eprintln!(
                    "real scramble gate failed: {}/{} rows succeeded",
                    report.success_count(),
                    report.rows().len()
                );
                return ExitCode::FAILURE;
            }
            if let Some(max_solution_len) = require_max_solution_len {
                let over_limit = over_max_solution_len_count(&report, max_solution_len);
                if over_limit > 0 {
                    eprintln!(
                        "real scramble gate failed: {over_limit} replay-verified successes exceeded {max_solution_len} moves"
                    );
                    return ExitCode::FAILURE;
                }
            }

            ExitCode::SUCCESS
        }
        Err(error) => {
            eprintln!("real scramble benchmark failed: {error}");
            ExitCode::FAILURE
        }
    }
}

fn solver_config(config: BenchmarkConfig) -> SolverConfig {
    let solver_config =
        SolverConfig::with_strategy(config.max_depth, config.max_nodes, config.strategy);

    if let Some(directory) = config.pruning_table_dir {
        solver_config.with_pruning_table_dir(directory)
    } else {
        solver_config
    }
}

fn parse_args(args: impl IntoIterator<Item = String>) -> Result<BenchmarkConfig, String> {
    let mut config = BenchmarkConfig::default();
    let mut args = args.into_iter();

    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--help" | "-h" => return Err(help_text()),
            "--strategy" => {
                config.strategy = parse_strategy(required_value("--strategy", args.next())?)?;
            }
            "--max-depth" => {
                config.max_depth =
                    parse_usize("--max-depth", required_value("--max-depth", args.next())?)?;
            }
            "--max-nodes" => {
                config.max_nodes = Some(parse_usize(
                    "--max-nodes",
                    required_value("--max-nodes", args.next())?,
                )?);
            }
            "--unlimited-nodes" => {
                config.max_nodes = None;
            }
            "--require-success" => {
                config.require_success = true;
            }
            "--require-max-solution-len" => {
                config.require_max_solution_len = Some(parse_usize(
                    "--require-max-solution-len",
                    required_value("--require-max-solution-len", args.next())?,
                )?);
            }
            "--pruning-table-dir" => {
                config.pruning_table_dir = Some(PathBuf::from(required_value(
                    "--pruning-table-dir",
                    args.next(),
                )?));
            }
            _ if arg.starts_with("--strategy=") => {
                config.strategy = parse_strategy(&arg["--strategy=".len()..])?;
            }
            _ if arg.starts_with("--max-depth=") => {
                config.max_depth = parse_usize("--max-depth", &arg["--max-depth=".len()..])?;
            }
            _ if arg.starts_with("--max-nodes=") => {
                config.max_nodes = Some(parse_usize("--max-nodes", &arg["--max-nodes=".len()..])?);
            }
            _ if arg.starts_with("--require-max-solution-len=") => {
                config.require_max_solution_len = Some(parse_usize(
                    "--require-max-solution-len",
                    &arg["--require-max-solution-len=".len()..],
                )?);
            }
            _ if arg.starts_with("--pruning-table-dir=") => {
                config.pruning_table_dir =
                    Some(PathBuf::from(&arg["--pruning-table-dir=".len()..]));
            }
            _ => return Err(format!("unknown argument: {arg}\n{}", help_text())),
        }
    }

    Ok(config)
}

fn all_rows_succeeded(report: &cube_engine::RealScrambleBenchmarkReport) -> bool {
    report.rows().iter().all(|row| {
        row.status == RealScrambleBenchmarkStatus::Success && row.replay_verified == Some(true)
    })
}

fn over_max_solution_len_count(
    report: &cube_engine::RealScrambleBenchmarkReport,
    max_solution_len: usize,
) -> usize {
    report
        .rows()
        .iter()
        .filter(|row| {
            row.status == RealScrambleBenchmarkStatus::Success
                && row.replay_verified == Some(true)
                && row
                    .solution_length
                    .is_none_or(|solution_length| solution_length > max_solution_len)
        })
        .count()
}

fn required_value(flag: &str, value: Option<String>) -> Result<String, String> {
    value.ok_or_else(|| format!("{flag} requires a value"))
}

fn parse_strategy(value: impl AsRef<str>) -> Result<SolverStrategy, String> {
    let value = value.as_ref();

    SolverStrategy::from_id(value)
        .ok_or_else(|| SolverStrategy::unsupported_strategy_message(value))
}

fn parse_usize(flag: &str, value: impl AsRef<str>) -> Result<usize, String> {
    let value = value.as_ref();

    value
        .parse()
        .map_err(|_| format!("{flag} must be a non-negative integer, got {value}"))
}

fn help_text() -> String {
    "usage: solver_real_scramble_report [--strategy ID] [--max-depth N] [--max-nodes N|--unlimited-nodes] [--pruning-table-dir DIR] [--require-success] [--require-max-solution-len N]\n\nDefaults: --strategy generated-two-phase --max-depth 30 --max-nodes 1000. Raise --max-nodes for deeper local runs. The report converts committed real scramble cases into cubie states and gives only those states to the selected solver; it never passes inverse scrambles as solutions. Use --require-success to fail the process unless every row succeeds with replay verification. Use --require-max-solution-len to fail when any replay-verified success is longer than N moves."
        .to_owned()
}

#[cfg(test)]
mod tests {
    use super::{parse_args, BenchmarkConfig};
    use cube_engine::SolverStrategy;
    use std::path::PathBuf;

    #[test]
    fn parse_args_uses_real_scramble_defaults() {
        assert_eq!(
            parse_args([]).expect("defaults should parse"),
            BenchmarkConfig::default()
        );
    }

    #[test]
    fn parse_args_accepts_strategy_limits_and_table_dir() {
        let config = parse_args([
            "--strategy=bounded-ida-star".to_owned(),
            "--max-depth".to_owned(),
            "20".to_owned(),
            "--max-nodes=1000".to_owned(),
            "--pruning-table-dir".to_owned(),
            "tmp/tables".to_owned(),
        ])
        .expect("explicit args should parse");

        assert_eq!(config.strategy, SolverStrategy::BoundedIdaStar);
        assert_eq!(config.max_depth, 20);
        assert_eq!(config.max_nodes, Some(1000));
        assert_eq!(config.pruning_table_dir, Some(PathBuf::from("tmp/tables")));
        assert!(!config.require_success);
    }

    #[test]
    fn parse_args_accepts_unlimited_nodes() {
        let config =
            parse_args(["--unlimited-nodes".to_owned()]).expect("unlimited nodes should parse");

        assert_eq!(config.max_nodes, None);
    }

    #[test]
    fn parse_args_accepts_require_success_gate() {
        let config =
            parse_args(["--require-success".to_owned()]).expect("require success should parse");

        assert!(config.require_success);
    }

    #[test]
    fn parse_args_accepts_max_solution_length_gate() {
        let config = parse_args(["--require-max-solution-len=20".to_owned()])
            .expect("max solution length gate should parse");

        assert_eq!(config.require_max_solution_len, Some(20));

        let config = parse_args(["--require-max-solution-len".to_owned(), "16".to_owned()])
            .expect("separate max solution length gate should parse");

        assert_eq!(config.require_max_solution_len, Some(16));
    }
}
