use std::process::ExitCode;

use cube_engine::solver::quality::{
    run_quality_report, run_quality_report_with_hybrid_value_outputs_path,
};

fn main() -> ExitCode {
    let args = std::env::args().skip(1).collect::<Vec<_>>();
    let report = match hybrid_value_outputs_path(args) {
        Ok(Some(path)) => run_quality_report_with_hybrid_value_outputs_path(path),
        Ok(None) => run_quality_report(),
        Err(error) => {
            eprintln!("{error}");
            return ExitCode::FAILURE;
        }
    };

    match report {
        Ok(report) => {
            print!("{}", report.to_markdown());
            ExitCode::SUCCESS
        }
        Err(error) => {
            eprintln!("solver quality report failed: {error}");
            ExitCode::FAILURE
        }
    }
}

fn hybrid_value_outputs_path(args: Vec<String>) -> Result<Option<String>, String> {
    match args.as_slice() {
        [] => Ok(None),
        [path] => Ok(Some(path.clone())),
        [flag, path] if flag == "--hybrid-value-outputs" => Ok(Some(path.clone())),
        _ => Err("usage: solver_quality_report [--hybrid-value-outputs <path>|<path>]".to_owned()),
    }
}
