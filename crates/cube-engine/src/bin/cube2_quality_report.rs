use std::process::ExitCode;

use cube_engine::puzzles::cube2::run_cube2_quality_report;

fn main() -> ExitCode {
    match run_cube2_quality_report() {
        Ok(report) => {
            print!("{}", report.to_markdown());
            if report.has_gate_failures() {
                eprintln!("2x2 quality report gate failed: report contains gate-failure statuses");
                ExitCode::FAILURE
            } else {
                ExitCode::SUCCESS
            }
        }
        Err(error) => {
            eprintln!("2x2 quality report failed: {error}");
            ExitCode::FAILURE
        }
    }
}
