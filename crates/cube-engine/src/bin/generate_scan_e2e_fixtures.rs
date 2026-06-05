use std::collections::BTreeSet;
use std::env;
use std::fs;
use std::process::ExitCode;

use cube_engine::puzzles::cube2::{
    cube2_visual_state, Cube2, Cube2Algorithm, Cube2Move, CUBE2_FACE_MOVES,
};
use cube_engine::{Cube, FaceletString, Scramble};
use serde_json::json;

const DEFAULT_CUBE3_COUNT: usize = 500;
const DEFAULT_CUBE2_COUNT: usize = 500;
const DEFAULT_CUBE3_SCRAMBLE_DEPTH: usize = 25;
const DEFAULT_CUBE2_SCRAMBLE_DEPTH: usize = 11;
const DEFAULT_CUBE3_SEED: u64 = 0x4355_4233_5000_0001;
const DEFAULT_CUBE2_SEED: u64 = 0x4355_4232_5000_0001;

const PRESERVED_CUBE3: [(&str, &str); 8] = [
    (
        "U' F2 U2 B2 F2 D' F2 D' F2 L2 U' B' L' D B L' R B2 D2 F'",
        "FBLUUFBRFLRBURRDLRRDULFBFLBRBRLDFURUDFUFLUBDDDDLBBDFUL",
    ),
    (
        "F D2 R U D' B' R2 U' L U2 L' F2 D2 F2 D2 R' L2 D2 F2 L F'",
        "FLDFUDRULFLRRRBBBLBFDRFUUDDRBLRDLURULDDULBRDFFFUUBLBFB",
    ),
    (
        "U' L' F2 U L2 D R2 D' L2 B2 D' B2 L2 U2 R' B2 L2 D R B F'",
        "BLDDUULRURRLURBURFBDFLFLDFLRLFUDFFBLRFUDLBDFBBDURBBDUR",
    ),
    (
        "L2 F2 D2 L B2 R B2 F2 D2 R D' L' R U2 F L2 B2 L U",
        "DDUFUDLUFURLURBBLLBLRUFBBDDDFLFDBBDDFUURLRULRFLRRBFFBR",
    ),
    (
        "U F' U' L2 U' F2 L2 D' F2 U' R2 D2 R B L B L D2 F2 D'",
        "RLFDUBDRRBRRURDLBUBDDDFFLFDURFUDUDRBUBLLLLRLFUFBFBBLUF",
    ),
    (
        "F' L D2 F2 D2 B2 L D F D2 B2 R B2 L2 D2 B2 R2 L",
        "UDFDUBRLLFRRFRBRDDBBDLFDRUBDLUUDBURLLLDULFLRFURBUBFBFF",
    ),
    (
        "U2 F' B2 R2 B' D' B U' R L2 U2 F U2 B2 U2 F L2 D2 R2 F'",
        "DUUDUBFULULRRRUBFDDBFLFBDRLFFULDLFDBBBLFLURDRBRLFBDRRU",
    ),
    (
        "L U L D2 R' B2 D2 F2 R F2 R B2 L2 B' L' D' F U R' B'",
        "LRRLUBLUDBDFDRULUBFBLRFRRFUULBBDRRURUDDFLBULBDFFFBDDLF",
    ),
];

const PRESERVED_CUBE2: [(&str, &str); 8] = [
    ("F2 U2 R' F' R2 U F2 R2 U", "BRLFLFFUBUULRDDRDULFDRBB"),
    ("F' R2 F R2 U' R' U' F2 U2", "RLDFUFDDFRBBURDFURLLUBLB"),
    ("U' R' F2 U R' F' U F2 U2", "FFLRURBBUBRRDDDLDFLFULUB"),
    ("R U F' R' F2 R2 F2 R' U'", "RRUUBUBBFRLLFUDRDLLDFFDB"),
    ("R' U2 F2 R' F U F2 R2 U2", "DLRLBFUFFURRDBDLRULFUBDB"),
    ("F R2 U' F R' F R' U2 F2 U'", "UULFRBLRUDUDRFDDBFLFLRBB"),
    ("R2 F R' F2 U F' U' R2 U", "FUBRDBFRDFULBDDULRLRLUFB"),
    ("R F2 U' R' F R2 F' R2 U2", "BLRFUFLUBRDDFFDRUDLRULBB"),
];

#[derive(Debug)]
struct Config {
    cube3_count: usize,
    cube2_count: usize,
    cube3_scramble_depth: usize,
    cube2_scramble_depth: usize,
    cube3_seed: u64,
    cube2_seed: u64,
    output: Option<String>,
}

fn main() -> ExitCode {
    let config = match Config::from_args(env::args().skip(1).collect()) {
        Ok(config) => config,
        Err(message) => {
            eprintln!("{message}");
            return ExitCode::FAILURE;
        }
    };

    let fixtures = match build_fixtures(&config) {
        Ok(fixtures) => fixtures,
        Err(message) => {
            eprintln!("{message}");
            return ExitCode::FAILURE;
        }
    };
    let output = json!({
        "generatedBy": "cube-engine generate_scan_e2e_fixtures",
        "cube3Count": config.cube3_count,
        "cube2Count": config.cube2_count,
        "cube3ScrambleDepth": config.cube3_scramble_depth,
        "cube2ScrambleDepth": config.cube2_scramble_depth,
        "cube3Seed": config.cube3_seed,
        "cube2Seed": config.cube2_seed,
        "fixtures": fixtures,
    });
    let serialized = serde_json::to_string_pretty(&output).expect("fixture JSON should serialize");

    if let Some(path) = config.output {
        if let Err(error) = fs::write(&path, serialized) {
            eprintln!("failed to write {path}: {error}");
            return ExitCode::FAILURE;
        }
    } else {
        println!("{serialized}");
    }

    ExitCode::SUCCESS
}

impl Config {
    fn from_args(args: Vec<String>) -> Result<Self, String> {
        let mut config = Self {
            cube3_count: DEFAULT_CUBE3_COUNT,
            cube2_count: DEFAULT_CUBE2_COUNT,
            cube3_scramble_depth: DEFAULT_CUBE3_SCRAMBLE_DEPTH,
            cube2_scramble_depth: DEFAULT_CUBE2_SCRAMBLE_DEPTH,
            cube3_seed: DEFAULT_CUBE3_SEED,
            cube2_seed: DEFAULT_CUBE2_SEED,
            output: None,
        };
        let mut index = 0;

        while index < args.len() {
            let flag = args[index].as_str();
            let value = args
                .get(index + 1)
                .ok_or_else(|| format!("missing value for {flag}"))?;
            match flag {
                "--cube3-count" => config.cube3_count = parse_usize(flag, value)?,
                "--cube2-count" => config.cube2_count = parse_usize(flag, value)?,
                "--cube3-depth" => config.cube3_scramble_depth = parse_usize(flag, value)?,
                "--cube2-depth" => config.cube2_scramble_depth = parse_usize(flag, value)?,
                "--cube3-seed" => config.cube3_seed = parse_u64(flag, value)?,
                "--cube2-seed" => config.cube2_seed = parse_u64(flag, value)?,
                "--output" => config.output = Some(value.to_owned()),
                "--help" => return Err(usage()),
                _ => return Err(format!("unknown option {flag}\n{}", usage())),
            }
            index += 2;
        }

        Ok(config)
    }
}

fn build_fixtures(config: &Config) -> Result<Vec<serde_json::Value>, String> {
    let mut fixtures = Vec::with_capacity(config.cube3_count + config.cube2_count);
    let mut cube3_states = BTreeSet::new();
    let mut cube2_states = BTreeSet::new();

    add_preserved_cube3(config.cube3_count, &mut fixtures, &mut cube3_states)?;
    add_generated_cube3(config, &mut fixtures, &mut cube3_states)?;
    add_preserved_cube2(config.cube2_count, &mut fixtures, &mut cube2_states)?;
    add_generated_cube2(config, &mut fixtures, &mut cube2_states)?;

    Ok(fixtures)
}

fn add_preserved_cube3(
    count: usize,
    fixtures: &mut Vec<serde_json::Value>,
    seen_states: &mut BTreeSet<String>,
) -> Result<(), String> {
    for (index, (scramble, expected_visual_state)) in PRESERVED_CUBE3.iter().take(count).enumerate()
    {
        let visual_state = cube3_visual_state(scramble)?;
        if visual_state != *expected_visual_state {
            return Err(format!(
                "preserved 3x3 fixture {} no longer matches Rust state",
                index + 1
            ));
        }
        seen_states.insert(visual_state.clone());
        fixtures.push(fixture_json(
            format!("cube3-preserved-{:03}", index + 1),
            "cube-3x3x3",
            index + 1,
            true,
            scramble,
            &visual_state,
        ));
    }

    Ok(())
}

fn add_generated_cube3(
    config: &Config,
    fixtures: &mut Vec<serde_json::Value>,
    seen_states: &mut BTreeSet<String>,
) -> Result<(), String> {
    let preserved_count = PRESERVED_CUBE3.len().min(config.cube3_count);
    let mut generated = 0;
    let mut attempts = 0;
    let max_attempts = config
        .cube3_count
        .saturating_mul(1_000)
        .saturating_add(1_000);

    while preserved_count + generated < config.cube3_count && attempts < max_attempts {
        let seed = generated_seed(config.cube3_seed, attempts);
        let scramble = Scramble::generate(config.cube3_scramble_depth, seed);
        let scramble = scramble.to_string();
        let visual_state = cube3_visual_state(&scramble)?;

        if seen_states.insert(visual_state.clone()) {
            generated += 1;
            let sequence = preserved_count + generated;
            fixtures.push(fixture_json(
                format!("cube3-generated-{:03}", generated),
                "cube-3x3x3",
                sequence,
                false,
                &scramble,
                &visual_state,
            ));
        }

        attempts += 1;
    }

    if preserved_count + generated != config.cube3_count {
        return Err(format!(
            "unable to generate {} unique 3x3 fixtures after {attempts} attempts",
            config.cube3_count
        ));
    }

    Ok(())
}

fn add_preserved_cube2(
    count: usize,
    fixtures: &mut Vec<serde_json::Value>,
    seen_states: &mut BTreeSet<String>,
) -> Result<(), String> {
    for (index, (scramble, expected_visual_state)) in PRESERVED_CUBE2.iter().take(count).enumerate()
    {
        let visual_state = cube2_visual_state_from_scramble(scramble)?;
        if visual_state != *expected_visual_state {
            return Err(format!(
                "preserved 2x2 fixture {} no longer matches Rust state",
                index + 1
            ));
        }
        seen_states.insert(visual_state.clone());
        fixtures.push(fixture_json(
            format!("cube2-preserved-{:03}", index + 1),
            "cube-2x2x2",
            index + 1,
            true,
            scramble,
            &visual_state,
        ));
    }

    Ok(())
}

fn add_generated_cube2(
    config: &Config,
    fixtures: &mut Vec<serde_json::Value>,
    seen_states: &mut BTreeSet<String>,
) -> Result<(), String> {
    let preserved_count = PRESERVED_CUBE2.len().min(config.cube2_count);
    let mut generated = 0;
    let mut attempts = 0;
    let max_attempts = config
        .cube2_count
        .saturating_mul(1_000)
        .saturating_add(1_000);

    while preserved_count + generated < config.cube2_count && attempts < max_attempts {
        let seed = generated_seed(config.cube2_seed, attempts);
        let algorithm = generate_cube2_algorithm(config.cube2_scramble_depth, seed);
        let scramble = algorithm.to_string();
        let visual_state = cube2_visual_state_from_algorithm(&algorithm);

        if seen_states.insert(visual_state.clone()) {
            generated += 1;
            let sequence = preserved_count + generated;
            fixtures.push(fixture_json(
                format!("cube2-generated-{:03}", generated),
                "cube-2x2x2",
                sequence,
                false,
                &scramble,
                &visual_state,
            ));
        }

        attempts += 1;
    }

    if preserved_count + generated != config.cube2_count {
        return Err(format!(
            "unable to generate {} unique 2x2 fixtures after {attempts} attempts",
            config.cube2_count
        ));
    }

    Ok(())
}

fn fixture_json(
    id: String,
    puzzle: &str,
    sequence: usize,
    preserved: bool,
    scramble: &str,
    visual_state: &str,
) -> serde_json::Value {
    json!({
        "id": id,
        "puzzle": puzzle,
        "sequence": sequence,
        "preserved": preserved,
        "scramble": scramble,
        "visualState": visual_state,
    })
}

fn cube3_visual_state(scramble: &str) -> Result<String, String> {
    let mut cube = Cube::solved();
    Scramble::parse(scramble)
        .map_err(|error| error.to_string())?
        .apply_to(&mut cube);

    Ok(FaceletString::from_cube(&cube).to_string())
}

fn cube2_visual_state_from_scramble(scramble: &str) -> Result<String, String> {
    let algorithm = Cube2Algorithm::parse(scramble).map_err(|error| error.to_string())?;

    Ok(cube2_visual_state_from_algorithm(&algorithm))
}

fn cube2_visual_state_from_algorithm(algorithm: &Cube2Algorithm) -> String {
    let mut cube = Cube2::solved();
    algorithm.apply_to(&mut cube);

    cube2_visual_state(&cube)
}

fn generate_cube2_algorithm(length: usize, seed: u64) -> Cube2Algorithm {
    let mut rng = FixtureRng::new(seed);
    let mut moves = Vec::with_capacity(length);
    let mut previous_move: Option<Cube2Move> = None;

    while moves.len() < length {
        let candidate = CUBE2_FACE_MOVES[rng.next_index(CUBE2_FACE_MOVES.len())];

        if previous_move.is_some_and(|move_| move_.axis() == candidate.axis()) {
            continue;
        }

        moves.push(candidate);
        previous_move = Some(candidate);
    }

    Cube2Algorithm::new(moves)
}

fn generated_seed(base: u64, attempts: usize) -> u64 {
    base.wrapping_add((attempts as u64).wrapping_mul(0x9e37_79b9_7f4a_7c15))
}

#[derive(Clone, Copy, Debug)]
struct FixtureRng {
    state: u64,
}

impl FixtureRng {
    const fn new(seed: u64) -> Self {
        Self { state: seed }
    }

    fn next_index(&mut self, upper_bound: usize) -> usize {
        debug_assert!(upper_bound > 0);

        self.state = self
            .state
            .wrapping_mul(6_364_136_223_846_793_005)
            .wrapping_add(1_442_695_040_888_963_407);

        (self.state % upper_bound as u64) as usize
    }
}

fn parse_usize(flag: &str, value: &str) -> Result<usize, String> {
    value
        .parse()
        .map_err(|error| format!("invalid value for {flag}: {error}"))
}

fn parse_u64(flag: &str, value: &str) -> Result<u64, String> {
    value
        .parse()
        .map_err(|error| format!("invalid value for {flag}: {error}"))
}

fn usage() -> String {
    "usage: generate_scan_e2e_fixtures [--cube3-count N] [--cube2-count N] [--cube3-depth N] [--cube2-depth N] [--cube3-seed N] [--cube2-seed N] [--output PATH]".to_owned()
}
