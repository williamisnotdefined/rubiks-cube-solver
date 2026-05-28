use std::collections::BTreeSet;
use std::env;
use std::path::PathBuf;

use cube_engine::dataset::{
    write_training_examples_jsonl, DatasetSplit, TrainingExample, DATASET_SCHEMA_VERSION,
    SOLVER_MULTIPROBE_VERIFIED_LABEL_SOURCE, SOLVER_QUALITY_VERIFIED_LABEL_SOURCE,
    SOLVER_VERIFIED_LABEL_SOURCE,
};
use cube_engine::search::{GeneratedTwoPhaseSolver, SearchBudget, SearchOutcome};
use cube_engine::{Algorithm, Cube, Scramble};

#[derive(Clone, Debug, Eq, PartialEq)]
struct GenerateSolverDatasetConfig {
    seed: u64,
    count: usize,
    output: PathBuf,
    max_scramble_depth: usize,
    solver_max_depth: usize,
    solver_max_nodes: Option<usize>,
    pruning_table_dir: PathBuf,
    solver_label_mode: SolverLabelMode,
}

impl Default for GenerateSolverDatasetConfig {
    fn default() -> Self {
        Self {
            seed: 0,
            count: 12,
            output: PathBuf::from("datasets/generated/solver-training.jsonl"),
            max_scramble_depth: 12,
            solver_max_depth: 30,
            solver_max_nodes: Some(1_000_000),
            pruning_table_dir: PathBuf::from("crates/cube-engine/pruning-tables"),
            solver_label_mode: SolverLabelMode::Standard,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum SolverLabelMode {
    Standard,
    Quality,
    Multiprobe,
}

impl SolverLabelMode {
    const fn id(self) -> &'static str {
        match self {
            Self::Standard => "generated-two-phase",
            Self::Quality => "generated-two-phase-quality",
            Self::Multiprobe => "generated-two-phase-multiprobe",
        }
    }

    const fn label_source(self) -> &'static str {
        match self {
            Self::Standard => SOLVER_VERIFIED_LABEL_SOURCE,
            Self::Quality => SOLVER_QUALITY_VERIFIED_LABEL_SOURCE,
            Self::Multiprobe => SOLVER_MULTIPROBE_VERIFIED_LABEL_SOURCE,
        }
    }

    fn solve(
        self,
        solver: &GeneratedTwoPhaseSolver,
        cube: &Cube,
        budget: SearchBudget,
    ) -> Result<SearchOutcome, String> {
        let result = match self {
            Self::Standard => solver.solve(cube, budget),
            Self::Quality => solver.solve_quality(cube, budget),
            Self::Multiprobe => solver.solve_multiprobe(cube, budget),
        };

        result
            .map(|result| result.outcome)
            .map_err(|error| error.to_string())
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
    let solver = GeneratedTwoPhaseSolver::load_from_dir(&config.pruning_table_dir)
        .map_err(|error| error.to_string())?;
    let examples = generate_examples(&config, &solver)?;
    write_training_examples_jsonl(&config.output, &examples).map_err(|error| error.to_string())?;

    println!(
        "generated {} solver-labeled dataset examples to {} (seed={}, max_scramble_depth={}, solver_max_depth={}, solver_max_nodes={}, solver_label_mode={})",
        examples.len(),
        config.output.display(),
        config.seed,
        config.max_scramble_depth,
        config.solver_max_depth,
        max_nodes_label(config.solver_max_nodes),
        config.solver_label_mode.id(),
    );

    Ok(())
}

fn generate_examples(
    config: &GenerateSolverDatasetConfig,
    solver: &GeneratedTwoPhaseSolver,
) -> Result<Vec<TrainingExample>, String> {
    let mut examples = Vec::with_capacity(config.count);
    let mut seen_states = BTreeSet::new();
    let mut rng = SolverDatasetRng::new(config.seed);
    let max_attempts = config.count.saturating_mul(100).saturating_add(100);
    let budget = SearchBudget::with_limits(config.solver_max_depth, config.solver_max_nodes);

    for attempt in 0..max_attempts {
        if examples.len() == config.count {
            return Ok(examples);
        }

        let depth = candidate_depth(&mut rng, attempt, config.max_scramble_depth);
        let scramble_seed = rng
            .next_u64()
            .wrapping_add(config.seed)
            .wrapping_add((attempt as u64).wrapping_mul(0x517c_c1b7_2722_0a95));
        let scramble = Scramble::generate(depth, scramble_seed);
        let Some(example) =
            solver_example_from_scramble(scramble, solver, budget, config.solver_label_mode)?
        else {
            continue;
        };

        if seen_states.insert(example.state.clone()) {
            examples.push(example);
        }
    }

    Err(format!(
        "could not generate {} solver-labeled examples; generated {} after {} attempts",
        config.count,
        examples.len(),
        max_attempts,
    ))
}

fn solver_example_from_scramble(
    scramble: Scramble,
    solver: &GeneratedTwoPhaseSolver,
    budget: SearchBudget,
    solver_label_mode: SolverLabelMode,
) -> Result<Option<TrainingExample>, String> {
    let mut cube = Cube::solved();
    scramble.apply_to(&mut cube);
    let state = cube.state().clone();
    let serialized_state = state.serialize();
    let outcome = solver_label_mode.solve(solver, &cube, budget)?;
    let solution = match outcome {
        SearchOutcome::Found(solution) => solution,
        SearchOutcome::NotFoundWithinLimits { .. } => return Ok(None),
    };

    let mut replay_cube = Cube::try_from_state(state.clone()).map_err(|error| error.to_string())?;
    replay_cube.apply_moves(solution.moves());
    if !replay_cube.is_solved() {
        return Err(format!(
            "solver-labeled solution for state {serialized_state:?} did not replay to solved"
        ));
    }

    let solution_algorithm = Algorithm::new(solution.moves().to_vec());

    Ok(Some(TrainingExample {
        schema_version: DATASET_SCHEMA_VERSION,
        state: serialized_state.clone(),
        scramble: scramble.to_string(),
        scramble_depth: scramble.len(),
        verified_solution: solution_algorithm.to_string(),
        verified_solution_length: solution_algorithm.len(),
        best_move: solution_algorithm.moves().first().copied(),
        label_source: solver_label_mode.label_source(),
        split: DatasetSplit::for_state(&serialized_state),
    }))
}

fn parse_args(
    args: impl IntoIterator<Item = String>,
) -> Result<GenerateSolverDatasetConfig, String> {
    let mut config = GenerateSolverDatasetConfig::default();
    let mut args = args.into_iter();

    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--help" | "-h" => return Err(help_text()),
            "--seed" => config.seed = parse_u64("--seed", required_value("--seed", args.next())?)?,
            "--count" => {
                config.count =
                    parse_positive_usize("--count", required_value("--count", args.next())?)?;
            }
            "--output" => config.output = PathBuf::from(required_value("--output", args.next())?),
            "--max-scramble-depth" => {
                config.max_scramble_depth = parse_usize(
                    "--max-scramble-depth",
                    required_value("--max-scramble-depth", args.next())?,
                )?;
            }
            "--solver-max-depth" => {
                config.solver_max_depth = parse_usize(
                    "--solver-max-depth",
                    required_value("--solver-max-depth", args.next())?,
                )?;
            }
            "--solver-max-nodes" => {
                config.solver_max_nodes = Some(parse_usize(
                    "--solver-max-nodes",
                    required_value("--solver-max-nodes", args.next())?,
                )?);
            }
            "--unlimited-solver-nodes" => config.solver_max_nodes = None,
            "--solver-label-mode" => {
                config.solver_label_mode =
                    parse_solver_label_mode(required_value("--solver-label-mode", args.next())?)?;
            }
            "--pruning-table-dir" => {
                config.pruning_table_dir =
                    PathBuf::from(required_value("--pruning-table-dir", args.next())?);
            }
            _ if arg.starts_with("--seed=") => {
                config.seed = parse_u64("--seed", &arg["--seed=".len()..])?;
            }
            _ if arg.starts_with("--count=") => {
                config.count = parse_positive_usize("--count", &arg["--count=".len()..])?;
            }
            _ if arg.starts_with("--output=") => {
                config.output = PathBuf::from(&arg["--output=".len()..]);
            }
            _ if arg.starts_with("--max-scramble-depth=") => {
                config.max_scramble_depth = parse_usize(
                    "--max-scramble-depth",
                    &arg["--max-scramble-depth=".len()..],
                )?;
            }
            _ if arg.starts_with("--solver-max-depth=") => {
                config.solver_max_depth =
                    parse_usize("--solver-max-depth", &arg["--solver-max-depth=".len()..])?;
            }
            _ if arg.starts_with("--solver-max-nodes=") => {
                config.solver_max_nodes = Some(parse_usize(
                    "--solver-max-nodes",
                    &arg["--solver-max-nodes=".len()..],
                )?);
            }
            _ if arg.starts_with("--solver-label-mode=") => {
                config.solver_label_mode =
                    parse_solver_label_mode(&arg["--solver-label-mode=".len()..])?;
            }
            _ if arg.starts_with("--pruning-table-dir=") => {
                config.pruning_table_dir = PathBuf::from(&arg["--pruning-table-dir=".len()..]);
            }
            _ => return Err(format!("unknown argument: {arg}\n{}", help_text())),
        }
    }

    Ok(config)
}

fn parse_solver_label_mode(value: impl AsRef<str>) -> Result<SolverLabelMode, String> {
    match value.as_ref() {
        "generated-two-phase" => Ok(SolverLabelMode::Standard),
        "generated-two-phase-quality" => Ok(SolverLabelMode::Quality),
        "generated-two-phase-multiprobe" => Ok(SolverLabelMode::Multiprobe),
        value => Err(format!(
            "--solver-label-mode must be one of generated-two-phase, generated-two-phase-quality, generated-two-phase-multiprobe; got {value}"
        )),
    }
}

fn required_value(flag: &str, value: Option<String>) -> Result<String, String> {
    value.ok_or_else(|| format!("{flag} requires a value"))
}

fn parse_u64(flag: &str, value: impl AsRef<str>) -> Result<u64, String> {
    let value = value.as_ref();

    value
        .parse()
        .map_err(|_| format!("{flag} must be an unsigned 64-bit integer, got {value}"))
}

fn parse_usize(flag: &str, value: impl AsRef<str>) -> Result<usize, String> {
    let value = value.as_ref();

    value
        .parse()
        .map_err(|_| format!("{flag} must be a non-negative integer, got {value}"))
}

fn parse_positive_usize(flag: &str, value: impl AsRef<str>) -> Result<usize, String> {
    let value = parse_usize(flag, value)?;
    if value == 0 {
        return Err(format!("{flag} must be greater than zero"));
    }

    Ok(value)
}

fn candidate_depth(
    rng: &mut SolverDatasetRng,
    attempts: usize,
    max_scramble_depth: usize,
) -> usize {
    if attempts == 0 || max_scramble_depth == 0 {
        return 0;
    }

    rng.next_index(max_scramble_depth) + 1
}

fn max_nodes_label(max_nodes: Option<usize>) -> String {
    max_nodes.map_or_else(|| "unlimited".to_owned(), |value| value.to_string())
}

fn help_text() -> String {
    "usage: generate_solver_dataset [--seed N] [--count N] [--output FILE] [--max-scramble-depth N] [--solver-max-depth N] [--solver-max-nodes N|--unlimited-solver-nodes] [--solver-label-mode ID] [--pruning-table-dir DIR]\n\nGenerates deterministic JSONL training examples labeled by a generated two-phase solver mode. Supported label modes: generated-two-phase, generated-two-phase-quality, generated-two-phase-multiprobe. The solver receives only cubie states; every emitted solution is replay verified."
        .to_owned()
}

#[derive(Clone, Copy, Debug)]
struct SolverDatasetRng {
    state: u64,
}

impl SolverDatasetRng {
    const fn new(seed: u64) -> Self {
        Self {
            state: seed ^ 0x9e37_79b9_7f4a_7c15,
        }
    }

    fn next_u64(&mut self) -> u64 {
        self.state = self
            .state
            .wrapping_mul(6_364_136_223_846_793_005)
            .wrapping_add(1_442_695_040_888_963_407);

        self.state
    }

    fn next_index(&mut self, upper_bound: usize) -> usize {
        debug_assert!(upper_bound > 0);

        (self.next_u64() % upper_bound as u64) as usize
    }
}

#[cfg(test)]
mod tests {
    use super::{parse_args, GenerateSolverDatasetConfig, SolverLabelMode};
    use std::path::PathBuf;

    #[test]
    fn parse_args_uses_documented_defaults() {
        assert_eq!(
            parse_args([]).expect("defaults should parse"),
            GenerateSolverDatasetConfig::default()
        );
    }

    #[test]
    fn parse_args_accepts_solver_dataset_options() {
        let config = parse_args([
            "--seed=7".to_owned(),
            "--count=25".to_owned(),
            "--output=tmp/solver.jsonl".to_owned(),
            "--max-scramble-depth=18".to_owned(),
            "--solver-max-depth=31".to_owned(),
            "--solver-max-nodes=2000".to_owned(),
            "--solver-label-mode=generated-two-phase-quality".to_owned(),
            "--pruning-table-dir=tmp/tables".to_owned(),
        ])
        .expect("options should parse");

        assert_eq!(config.seed, 7);
        assert_eq!(config.count, 25);
        assert_eq!(config.output, PathBuf::from("tmp/solver.jsonl"));
        assert_eq!(config.max_scramble_depth, 18);
        assert_eq!(config.solver_max_depth, 31);
        assert_eq!(config.solver_max_nodes, Some(2000));
        assert_eq!(config.solver_label_mode, SolverLabelMode::Quality);
        assert_eq!(config.pruning_table_dir, PathBuf::from("tmp/tables"));
    }

    #[test]
    fn parse_args_accepts_unlimited_solver_nodes() {
        let config = parse_args(["--unlimited-solver-nodes".to_owned()])
            .expect("unlimited nodes should parse");

        assert_eq!(config.solver_max_nodes, None);
    }

    #[test]
    fn parse_args_accepts_separate_solver_label_mode() {
        let config = parse_args([
            "--solver-label-mode".to_owned(),
            "generated-two-phase-multiprobe".to_owned(),
        ])
        .expect("separate solver label mode should parse");

        assert_eq!(config.solver_label_mode, SolverLabelMode::Multiprobe);
    }

    #[test]
    fn parse_args_rejects_unknown_solver_label_mode() {
        let error = parse_args(["--solver-label-mode=made-up".to_owned()])
            .expect_err("unknown solver label mode should fail");

        assert!(error.contains("--solver-label-mode must be one of"));
        assert!(error.contains("made-up"));
    }
}
