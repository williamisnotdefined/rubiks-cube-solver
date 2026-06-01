use crate::cube::{Algorithm, Cube, CubieState, FaceletString};

use super::errors::QualityReportError;
use super::types::{
    QualityExpectation, QualityFixture, QualityFixtureCategory, QualityFixtureExpectations,
    QualityInputKind,
};

pub fn quality_fixtures() -> Result<Vec<QualityFixture>, QualityReportError> {
    [
        QualityFixtureSpec::new(
            "solved-facelets",
            QualityFixtureCategory::Solved,
            QualityInputKind::Facelet,
            QualityExpectation::RequiredSuccess,
            "",
            0,
            Some(1_000),
        ),
        QualityFixtureSpec::new(
            "solved-cubie",
            QualityFixtureCategory::Solved,
            QualityInputKind::Cubie,
            QualityExpectation::RequiredSuccess,
            "",
            0,
            Some(1_000),
        ),
        QualityFixtureSpec::new(
            "shallow-facelets-f",
            QualityFixtureCategory::Shallow,
            QualityInputKind::Facelet,
            QualityExpectation::RequiredSuccess,
            "F",
            1,
            Some(10_000),
        ),
        QualityFixtureSpec::new(
            "shallow-cubie-r-u",
            QualityFixtureCategory::Shallow,
            QualityInputKind::Cubie,
            QualityExpectation::RequiredSuccess,
            "R U",
            2,
            Some(10_000),
        )
        .with_solver_expectations(QualityFixtureExpectations::new(
            QualityExpectation::RequiredSuccess,
            QualityExpectation::RequiredSuccess,
        )),
        QualityFixtureSpec::new(
            "nontrivial-facelets-r-u-rprime-uprime",
            QualityFixtureCategory::Nontrivial,
            QualityInputKind::Facelet,
            QualityExpectation::RequiredSuccess,
            "R U R' U'",
            4,
            Some(1_000_000),
        )
        .with_solver_expectations(QualityFixtureExpectations::new(
            QualityExpectation::RequiredSuccess,
            QualityExpectation::RequiredSuccess,
        )),
        QualityFixtureSpec::new(
            "nontrivial-cubie-r-u-rprime-uprime",
            QualityFixtureCategory::Nontrivial,
            QualityInputKind::Cubie,
            QualityExpectation::RequiredSuccess,
            "R U R' U'",
            4,
            Some(1_000_000),
        )
        .with_solver_expectations(QualityFixtureExpectations::new(
            QualityExpectation::RequiredSuccess,
            QualityExpectation::RequiredSuccess,
        )),
        QualityFixtureSpec::new(
            "mid-depth-facelets-five-move",
            QualityFixtureCategory::MidDepth,
            QualityInputKind::Facelet,
            QualityExpectation::ExpectedNotFoundWithinLimits,
            "R U R' U' F",
            4,
            Some(100_000),
        ),
        QualityFixtureSpec::new(
            "mid-depth-cubie-five-move",
            QualityFixtureCategory::MidDepth,
            QualityInputKind::Cubie,
            QualityExpectation::ExpectedNotFoundWithinLimits,
            "F R U R' U'",
            4,
            Some(100_000),
        ),
        QualityFixtureSpec::new(
            "generated-mid-depth-facelets-phase2-five-move",
            QualityFixtureCategory::MidDepth,
            QualityInputKind::Facelet,
            QualityExpectation::ExpectedNotFoundWithinLimits,
            "U R2 F2 D L2",
            6,
            Some(1_000_000),
        )
        .with_solver_expectations(QualityFixtureExpectations::new(
            QualityExpectation::ExpectedNotFoundWithinLimits,
            QualityExpectation::RequiredSuccess,
        )),
        QualityFixtureSpec::new(
            "generated-mid-depth-cubie-phase2-five-move",
            QualityFixtureCategory::MidDepth,
            QualityInputKind::Cubie,
            QualityExpectation::ExpectedNotFoundWithinLimits,
            "U R2 F2 D L2",
            6,
            Some(1_000_000),
        )
        .with_solver_expectations(QualityFixtureExpectations::new(
            QualityExpectation::ExpectedNotFoundWithinLimits,
            QualityExpectation::RequiredSuccess,
        )),
        QualityFixtureSpec::new(
            "generated-harder-facelets-phase2-eight-move",
            QualityFixtureCategory::Harder,
            QualityInputKind::Facelet,
            QualityExpectation::ExpectedNotFoundWithinLimits,
            "U R2 F2 D L2 B2 U2 R2",
            8,
            Some(1_000_000),
        )
        .with_solver_expectations(QualityFixtureExpectations::new(
            QualityExpectation::ExpectedNotFoundWithinLimits,
            QualityExpectation::RequiredSuccess,
        )),
        QualityFixtureSpec::new(
            "generated-harder-cubie-phase2-eight-move",
            QualityFixtureCategory::Harder,
            QualityInputKind::Cubie,
            QualityExpectation::ExpectedNotFoundWithinLimits,
            "U R2 F2 D L2 B2 U2 R2",
            8,
            Some(1_000_000),
        )
        .with_solver_expectations(QualityFixtureExpectations::new(
            QualityExpectation::ExpectedNotFoundWithinLimits,
            QualityExpectation::RequiredSuccess,
        )),
        QualityFixtureSpec::new(
            "harder-facelets-six-move",
            QualityFixtureCategory::Harder,
            QualityInputKind::Facelet,
            QualityExpectation::ExpectedNotFoundWithinLimits,
            "F R U R' U' F'",
            2,
            Some(50_000),
        ),
        QualityFixtureSpec::new(
            "harder-cubie-nine-move",
            QualityFixtureCategory::Harder,
            QualityInputKind::Cubie,
            QualityExpectation::ExpectedNotFoundWithinLimits,
            "R U R' U' F2 D L' B U2",
            2,
            Some(50_000),
        ),
    ]
    .into_iter()
    .map(QualityFixtureSpec::build)
    .collect()
}

pub(super) fn validate_quality_fixture(fixture: &QualityFixture) -> Result<(), QualityReportError> {
    fixture
        .state
        .validate()
        .map_err(|error| QualityReportError::FixtureCubieValidation {
            fixture_id: fixture.id,
            error,
        })?;

    let parsed = FaceletString::parse(&fixture.facelets).map_err(|error| {
        QualityReportError::FixtureFaceletParse {
            fixture_id: fixture.id,
            error,
        }
    })?;
    let recovered =
        parsed
            .to_cubie_state()
            .map_err(|error| QualityReportError::FixtureFaceletConversion {
                fixture_id: fixture.id,
                error: Box::new(error),
            })?;

    if recovered != fixture.state {
        return Err(QualityReportError::FixtureRoundTripMismatch {
            fixture_id: fixture.id,
        });
    }

    let cube = Cube::try_from_state(fixture.state.clone()).map_err(|error| {
        QualityReportError::FixtureCubieValidation {
            fixture_id: fixture.id,
            error,
        }
    })?;
    if FaceletString::from_cube(&cube).to_string() != fixture.facelets {
        return Err(QualityReportError::FixtureRoundTripMismatch {
            fixture_id: fixture.id,
        });
    }

    Ok(())
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
struct QualityFixtureSpec {
    id: &'static str,
    category: QualityFixtureCategory,
    input_kind: QualityInputKind,
    expectation: QualityExpectation,
    solver_expectations: QualityFixtureExpectations,
    scramble: &'static str,
    max_depth: usize,
    max_nodes: Option<usize>,
}

impl QualityFixtureSpec {
    const fn new(
        id: &'static str,
        category: QualityFixtureCategory,
        input_kind: QualityInputKind,
        expectation: QualityExpectation,
        scramble: &'static str,
        max_depth: usize,
        max_nodes: Option<usize>,
    ) -> Self {
        Self {
            id,
            category,
            input_kind,
            expectation,
            solver_expectations: QualityFixtureExpectations::same(expectation),
            scramble,
            max_depth,
            max_nodes,
        }
    }

    const fn with_solver_expectations(
        mut self,
        solver_expectations: QualityFixtureExpectations,
    ) -> Self {
        self.solver_expectations = solver_expectations;

        self
    }

    fn build(self) -> Result<QualityFixture, QualityReportError> {
        let mut cube = Cube::solved();
        if !self.scramble.is_empty() {
            let algorithm = Algorithm::parse(self.scramble).map_err(|error| {
                QualityReportError::FixtureNotation {
                    fixture_id: self.id,
                    error,
                }
            })?;
            algorithm.apply_to(&mut cube);
        }

        let state = cube.state().clone();
        state
            .validate()
            .map_err(|error| QualityReportError::FixtureCubieValidation {
                fixture_id: self.id,
                error,
            })?;

        let facelets = validated_facelets(self.id, &cube, &state)?;

        Ok(QualityFixture {
            id: self.id,
            category: self.category,
            input_kind: self.input_kind,
            expectation: self.expectation,
            solver_expectations: self.solver_expectations,
            scramble: self.scramble,
            max_depth: self.max_depth,
            max_nodes: self.max_nodes,
            state,
            facelets,
        })
    }
}

fn validated_facelets(
    fixture_id: &'static str,
    cube: &Cube,
    state: &CubieState,
) -> Result<String, QualityReportError> {
    let rendered = FaceletString::from_cube(cube).to_string();
    let parsed = FaceletString::parse(&rendered)
        .map_err(|error| QualityReportError::FixtureFaceletParse { fixture_id, error })?;
    let recovered =
        parsed
            .to_cubie_state()
            .map_err(|error| QualityReportError::FixtureFaceletConversion {
                fixture_id,
                error: Box::new(error),
            })?;

    if &recovered != state {
        return Err(QualityReportError::FixtureRoundTripMismatch { fixture_id });
    }

    Ok(rendered)
}
