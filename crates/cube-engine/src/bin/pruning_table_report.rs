use std::env;
use std::path::PathBuf;
use std::process::ExitCode;

use cube_engine::search::pruning::{
    PruningTable, DEFAULT_PRUNING_TABLE_DIR, GENERATED_PRUNING_TABLE_SPECS,
};

#[derive(Clone, Debug, Eq, PartialEq)]
struct ReportConfig {
    directory: PathBuf,
}

impl Default for ReportConfig {
    fn default() -> Self {
        Self {
            directory: PathBuf::from(DEFAULT_PRUNING_TABLE_DIR),
        }
    }
}

fn main() -> ExitCode {
    let config = match parse_args(env::args().skip(1)) {
        Ok(config) => config,
        Err(message) => {
            eprintln!("{message}");
            return ExitCode::FAILURE;
        }
    };

    match report(&config) {
        Ok(output) => {
            print!("{output}");
            ExitCode::SUCCESS
        }
        Err(error) => {
            eprintln!("{error}");
            ExitCode::FAILURE
        }
    }
}

fn report(config: &ReportConfig) -> Result<String, String> {
    let mut output = format!(
        "# Pruning Table Coverage\n\nDirectory: {}\n\n| table | max_depth | entries | table_size | coverage | complete | artifact |\n| --- | ---: | ---: | ---: | ---: | --- | --- |\n",
        config.directory.display()
    );

    for spec in GENERATED_PRUNING_TABLE_SPECS {
        let path = spec.file_path(&config.directory);
        let table = PruningTable::load_artifact(&path)
            .map_err(|error| format!("failed to load {}: {error}", path.display()))?;
        spec.validate_table(&table, &path)
            .map_err(|error| format!("invalid table {}: {error}", path.display()))?;
        let table_size = table
            .metadata()
            .table_size()
            .map_err(|error| format!("invalid metadata for {}: {error}", path.display()))?;
        let entries = table.entry_count();
        let coverage = coverage_percent(entries, table_size);

        output.push_str(&format!(
            "| {} | {} | {} | {} | {:.4}% | {} | {} |\n",
            spec.table_name,
            table.metadata().generation.max_depth,
            entries,
            table_size,
            coverage,
            table.is_complete(),
            path.display(),
        ));
    }

    Ok(output)
}

fn coverage_percent(entries: usize, table_size: usize) -> f64 {
    if table_size == 0 {
        return 0.0;
    }

    (entries as f64 / table_size as f64) * 100.0
}

fn parse_args(args: impl IntoIterator<Item = String>) -> Result<ReportConfig, String> {
    let mut config = ReportConfig::default();
    let mut args = args.into_iter();

    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--help" | "-h" => return Err(help_text()),
            "--dir" => {
                config.directory = PathBuf::from(required_value("--dir", args.next())?);
            }
            _ if arg.starts_with("--dir=") => {
                config.directory = PathBuf::from(&arg["--dir=".len()..]);
            }
            _ => return Err(format!("unknown argument: {arg}\n{}", help_text())),
        }
    }

    Ok(config)
}

fn required_value(flag: &str, value: Option<String>) -> Result<String, String> {
    value.ok_or_else(|| format!("{flag} requires a value"))
}

fn help_text() -> String {
    "usage: pruning_table_report [--dir DIR]\n\nReports generated pruning-table coverage for the selected directory."
        .to_owned()
}

#[cfg(test)]
mod tests {
    use super::{coverage_percent, parse_args, ReportConfig};
    use std::path::PathBuf;

    #[test]
    fn coverage_percent_reports_fraction() {
        assert_eq!(coverage_percent(25, 100), 25.0);
        assert_eq!(coverage_percent(1, 0), 0.0);
    }

    #[test]
    fn parse_args_uses_default_directory() {
        assert_eq!(
            parse_args([]).expect("defaults should parse"),
            ReportConfig::default()
        );
    }

    #[test]
    fn parse_args_accepts_directory() {
        let config = parse_args(["--dir=tmp/tables".to_owned()]).expect("dir should parse");

        assert_eq!(config.directory, PathBuf::from("tmp/tables"));
    }
}
