use crate::cube::{Cube, Scramble};

use super::types::{RealScrambleBenchmarkError, RealScrambleFixture, RealScrambleSpec};

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

fn build_real_scramble_fixture(
    spec: RealScrambleSpec,
) -> Result<RealScrambleFixture, RealScrambleBenchmarkError> {
    let scramble =
        Scramble::parse(spec.scramble).map_err(|error| RealScrambleBenchmarkError::Notation {
            fixture_id: spec.id,
            error,
        })?;
    let mut cube = Cube::solved();
    scramble.apply_to(&mut cube);
    let state = cube.state().clone();
    state
        .validate()
        .map_err(|error| RealScrambleBenchmarkError::CubieValidation {
            fixture_id: spec.id,
            error,
        })?;

    Ok(RealScrambleFixture {
        id: spec.id,
        scramble: spec.scramble,
        scramble_len: scramble.len(),
        state,
    })
}
