use std::process::ExitCode;

use cube_engine::solver::quality::run_quality_report;

fn main() -> ExitCode {
    match run_quality_report() {
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
