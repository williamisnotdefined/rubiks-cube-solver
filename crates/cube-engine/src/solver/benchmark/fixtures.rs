use std::collections::BTreeSet;

use crate::cube::{Cube, Scramble};

use super::types::{
    GeneratedRealScrambleConfig, RealScrambleBenchmarkError, RealScrambleFixture, RealScrambleSpec,
};

pub const REAL_SCRAMBLE_SPECS: [RealScrambleSpec; 9] = [
    RealScrambleSpec {
        id: "real-01",
        scramble: "B U L U D B' U' R' U' B U2 F' L2 B2 R2 D2 L2 D2 R2 F D2",
    },
    RealScrambleSpec {
        id: "real-02",
        scramble: "F' U L' D2 L' D2 F' B R B2 U2 D F2 B2 L2 U B2 R2 D' L2 U2",
    },
    RealScrambleSpec {
        id: "real-03",
        scramble: "L2 F2 D2 L B2 R B2 F2 D2 R D' L' R U2 F L2 B2 L U",
    },
    RealScrambleSpec {
        id: "real-04",
        scramble: "F2 D F' U2 L' B R F' L D2 R U2 R F2 R' F2 R2 F2 L' F2",
    },
    RealScrambleSpec {
        id: "real-05-duplicate-of-real-04",
        scramble: "F2 D F' U2 L' B R F' L D2 R U2 R F2 R' F2 R2 F2 L' F2",
    },
    RealScrambleSpec {
        id: "real-06",
        scramble: "L D' F L2 F' U2 B' D2 B2 U2 L2 B2 F' D' L' F2 D' F U F",
    },
    RealScrambleSpec {
        id: "real-07",
        scramble: "L D' R2 D2 R2 B' L2 D2 F' L2 R2 D2 F U' F L' B' U' R2 D' B'",
    },
    RealScrambleSpec {
        id: "real-08",
        scramble: "U2 B2 D2 F D2 R2 B' D2 U2 F' D2 F' D' F' D2 L' F D U2 L' F'",
    },
    RealScrambleSpec {
        id: "real-09",
        scramble: "F L' D2 R' B' D' F2 R F2 U' R2 B2 U2 D' F2 B2 R2 U L2 F' R'",
    },
];

pub fn real_scramble_fixtures() -> Result<Vec<RealScrambleFixture>, RealScrambleBenchmarkError> {
    REAL_SCRAMBLE_SPECS
        .iter()
        .map(|spec| build_real_scramble_fixture(*spec))
        .collect()
}

pub fn generated_real_scramble_fixtures(
    config: GeneratedRealScrambleConfig,
) -> Result<Vec<RealScrambleFixture>, RealScrambleBenchmarkError> {
    let mut fixtures = if config.include_committed {
        real_scramble_fixtures()?
    } else {
        Vec::new()
    };
    let mut seen_states = fixtures
        .iter()
        .map(|fixture| fixture.state.serialize())
        .collect::<BTreeSet<_>>();
    let mut generated = 0_usize;
    let mut attempts = 0_usize;
    let max_attempts = config.count.saturating_mul(500).saturating_add(500);

    while generated < config.count && attempts < max_attempts {
        let scramble_seed = generated_scramble_seed(config.seed, attempts);
        let scramble = Scramble::generate(config.scramble_depth, scramble_seed);
        let fixture = build_scramble_fixture(
            format!(
                "generated-seed{}-depth{}-{:04}",
                config.seed,
                config.scramble_depth,
                generated + 1
            ),
            scramble,
        )?;

        if seen_states.insert(fixture.state.serialize()) {
            fixtures.push(fixture);
            generated += 1;
        }

        attempts += 1;
    }

    if generated != config.count {
        return Err(RealScrambleBenchmarkError::UnableToGenerateUniqueFixtures {
            requested: config.count,
            generated,
            attempts,
            scramble_depth: config.scramble_depth,
        });
    }

    Ok(fixtures)
}

fn build_real_scramble_fixture(
    spec: RealScrambleSpec,
) -> Result<RealScrambleFixture, RealScrambleBenchmarkError> {
    let scramble =
        Scramble::parse(spec.scramble).map_err(|error| RealScrambleBenchmarkError::Notation {
            fixture_id: spec.id.to_owned(),
            error,
        })?;

    build_scramble_fixture(spec.id.to_owned(), scramble)
}

fn build_scramble_fixture(
    id: String,
    scramble: Scramble,
) -> Result<RealScrambleFixture, RealScrambleBenchmarkError> {
    let mut cube = Cube::solved();
    scramble.apply_to(&mut cube);
    let state = cube.state().clone();
    state
        .validate()
        .map_err(|error| RealScrambleBenchmarkError::CubieValidation {
            fixture_id: id.clone(),
            error,
        })?;
    let scramble_len = scramble.len();
    let scramble = scramble.to_string();

    Ok(RealScrambleFixture {
        id,
        scramble,
        scramble_len,
        state,
    })
}

fn generated_scramble_seed(seed: u64, attempts: usize) -> u64 {
    seed.wrapping_add((attempts as u64).wrapping_mul(0x9e37_79b9_7f4a_7c15))
}
