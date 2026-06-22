use std::process::ExitCode;

use cube_engine::solver::quality::run_quality_report;

fn main() -> ExitCode {
    let report = run_quality_report();

    match report {
        Ok(report) => {
            print!("{}", report.to_markdown());
            if report.has_gate_failures() {
                eprintln!(
                    "solver quality report gate failed: report contains gate-failure statuses"
                );
                ExitCode::FAILURE
            } else {
                ExitCode::SUCCESS
            }
        }
        Err(error) => {
            eprintln!("solver quality report failed: {error}");
            ExitCode::FAILURE
        }
    }
}
