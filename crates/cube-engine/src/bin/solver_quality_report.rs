use std::process::ExitCode;

use cube_engine::solver::quality::{
    run_quality_report, run_quality_report_with_hybrid_value_model_path,
    run_quality_report_with_hybrid_value_outputs_path,
};

#[derive(Clone, Debug, Eq, PartialEq)]
enum HybridInputPath {
    ValueOutputs(String),
    ValueModel(String),
}

fn main() -> ExitCode {
    let args = std::env::args().skip(1).collect::<Vec<_>>();
    let report = match hybrid_input_path(args) {
        Ok(Some(HybridInputPath::ValueOutputs(path))) => {
            run_quality_report_with_hybrid_value_outputs_path(path)
        }
        Ok(Some(HybridInputPath::ValueModel(path))) => {
            run_quality_report_with_hybrid_value_model_path(path)
        }
        Ok(None) => run_quality_report(),
        Err(error) => {
            eprintln!("{error}");
            return ExitCode::FAILURE;
        }
    };

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

fn hybrid_input_path(args: Vec<String>) -> Result<Option<HybridInputPath>, String> {
    match args.as_slice() {
        [] => Ok(None),
        [path] => Ok(Some(HybridInputPath::ValueOutputs(path.clone()))),
        [flag, path] if flag == "--hybrid-value-outputs" => {
            Ok(Some(HybridInputPath::ValueOutputs(path.clone())))
        }
        [flag, path] if flag == "--hybrid-value-model" => {
            Ok(Some(HybridInputPath::ValueModel(path.clone())))
        }
        _ => Err(
            "usage: solver_quality_report [--hybrid-value-outputs <path>|--hybrid-value-model <path>|<path>]"
                .to_owned(),
        ),
    }
}
