pub mod benchmark;
mod config;
mod dispatch;
mod errors;
mod input;
mod playback;
pub mod quality;
mod result;
mod strategy;

pub use config::SolverConfig;
pub use dispatch::{solve_cube, solve_cube_with_generated_pruning_tables};
pub use errors::{FaceletPlaybackError, SolveError, SolveInputError};
pub use input::{
    solve_cubie_state, solve_cubie_state_with_generated_pruning_tables, solve_facelet_string,
    solve_facelet_string_with_generated_pruning_tables, validate_facelet_string,
};
pub use playback::playback_facelet_solution;
pub use result::{FaceletPlaybackResult, SolveMetrics, SolveResult};
pub use strategy::{SolverStrategy, SolverStrategyMetadata};

#[cfg(test)]
pub(crate) use dispatch::solve_search_outcome;

#[cfg(test)]
mod tests {
    use super::{
        playback_facelet_solution, solve_cube, solve_cubie_state, solve_facelet_string,
        solve_search_outcome, validate_facelet_string, FaceletPlaybackError, SolveError,
        SolveInputError, SolveMetrics, SolveResult, SolverConfig, SolverStrategy,
    };
    use crate::cube::cubies::{Corner, Edge};
    use crate::cube::facelets::FACELET_COUNT;
    use crate::cube::{
        Cube, CubeValidationError, CubieState, Facelet, FaceletConversionError, FaceletParseError,
        FaceletString, Move, CENTER_FACELET_POSITIONS, EDGE_FACELET_MAPPINGS,
    };
    use crate::search::{SearchOutcome, SearchSolution};

    const SOLVED_FACELET_STRING: &str = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB";

    #[test]
    fn solver_config_stores_depth_and_node_limit() {
        let config = SolverConfig::with_limits(20, Some(1_000));

        assert_eq!(config.max_depth, 20);
        assert_eq!(config.max_nodes, Some(1_000));
        assert_eq!(config.strategy, SolverStrategy::BoundedIdaStar);

        let unlimited_nodes = SolverConfig::new(20);
        assert_eq!(unlimited_nodes.max_depth, 20);
        assert_eq!(unlimited_nodes.max_nodes, None);
        assert_eq!(unlimited_nodes.strategy, SolverStrategy::BoundedIdaStar);

        let generated =
            SolverConfig::with_strategy(2, Some(100), SolverStrategy::GeneratedTwoPhase)
                .with_pruning_table_dir("tmp/generated-pruning-tables");
        assert_eq!(generated.strategy, SolverStrategy::GeneratedTwoPhase);
        assert_eq!(
            generated.pruning_table_dir().to_string_lossy(),
            "tmp/generated-pruning-tables"
        );

        let quality = SolverConfig::with_strategy(
            20,
            Some(1_000_000),
            SolverStrategy::GeneratedTwoPhaseQuality,
        )
        .with_pruning_table_dir("tmp/generated-pruning-tables");
        assert_eq!(quality.strategy, SolverStrategy::GeneratedTwoPhaseQuality);
        assert_eq!(
            quality.pruning_table_dir().to_string_lossy(),
            "tmp/generated-pruning-tables"
        );

        let multiprobe = SolverConfig::with_strategy(
            20,
            Some(1_000_000),
            SolverStrategy::GeneratedTwoPhaseMultiprobe,
        )
        .with_pruning_table_dir("tmp/generated-pruning-tables");
        assert_eq!(
            multiprobe.strategy,
            SolverStrategy::GeneratedTwoPhaseMultiprobe
        );
        assert_eq!(
            multiprobe.pruning_table_dir().to_string_lossy(),
            "tmp/generated-pruning-tables"
        );

        let corner_pdb = SolverConfig::with_strategy(
            20,
            Some(1_000_000),
            SolverStrategy::OptimalBoundedCornerPdb,
        )
        .with_pruning_table_dir("tmp/generated-pruning-tables");
        assert_eq!(corner_pdb.strategy, SolverStrategy::OptimalBoundedCornerPdb);
        assert_eq!(
            corner_pdb.pruning_table_dir().to_string_lossy(),
            "tmp/generated-pruning-tables"
        );
    }

    #[test]
    fn solver_strategy_exposes_stable_boundary_metadata() {
        assert_eq!(
            SolverStrategy::ALL,
            [
                SolverStrategy::BoundedIdaStar,
                SolverStrategy::GeneratedTwoPhase,
                SolverStrategy::GeneratedTwoPhaseQuality,
                SolverStrategy::GeneratedTwoPhaseMultiprobe,
                SolverStrategy::OptimalBoundedCornerPdb,
                SolverStrategy::OptimalBoundedPdb16,
                SolverStrategy::ShortSolutionPortfolio,
            ]
        );

        assert_eq!(SolverStrategy::BoundedIdaStar.id(), "bounded-ida-star");
        assert_eq!(SolverStrategy::BoundedIdaStar.label(), "Bounded IDA*");
        assert_eq!(
            SolverStrategy::BoundedIdaStar.solver_mode(),
            "bounded_ida_star"
        );
        assert!(SolverStrategy::BoundedIdaStar
            .status_text()
            .contains("Default product fallback"));
        assert_eq!(
            SolverStrategy::from_id("bounded-ida-star"),
            Some(SolverStrategy::BoundedIdaStar)
        );

        assert_eq!(
            SolverStrategy::GeneratedTwoPhase.id(),
            "generated-two-phase"
        );
        assert_eq!(
            SolverStrategy::GeneratedTwoPhase.label(),
            "Generated two-phase solver"
        );
        assert_eq!(
            SolverStrategy::GeneratedTwoPhase.solver_mode(),
            "generated_two_phase"
        );
        assert!(SolverStrategy::GeneratedTwoPhase
            .status_text()
            .contains("Generated-table solver"));
        assert_eq!(
            SolverStrategy::from_id("generated-two-phase"),
            Some(SolverStrategy::GeneratedTwoPhase)
        );
        assert_eq!(
            SolverStrategy::GeneratedTwoPhaseQuality.id(),
            "generated-two-phase-quality"
        );
        assert_eq!(
            SolverStrategy::GeneratedTwoPhaseQuality.label(),
            "Generated two-phase quality solver"
        );
        assert_eq!(
            SolverStrategy::GeneratedTwoPhaseQuality.solver_mode(),
            "generated_two_phase_quality"
        );
        assert!(SolverStrategy::GeneratedTwoPhaseQuality
            .status_text()
            .contains("shorter total depths"));
        assert_eq!(
            SolverStrategy::from_id("generated-two-phase-quality"),
            Some(SolverStrategy::GeneratedTwoPhaseQuality)
        );
        assert_eq!(
            SolverStrategy::GeneratedTwoPhaseMultiprobe.id(),
            "generated-two-phase-multiprobe"
        );
        assert_eq!(
            SolverStrategy::GeneratedTwoPhaseMultiprobe.label(),
            "Generated two-phase multiprobe solver"
        );
        assert_eq!(
            SolverStrategy::GeneratedTwoPhaseMultiprobe.solver_mode(),
            "generated_two_phase_multiprobe"
        );
        assert!(SolverStrategy::GeneratedTwoPhaseMultiprobe
            .status_text()
            .contains("move-order probes"));
        assert_eq!(
            SolverStrategy::from_id("generated-two-phase-multiprobe"),
            Some(SolverStrategy::GeneratedTwoPhaseMultiprobe)
        );
        assert_eq!(
            SolverStrategy::OptimalBoundedCornerPdb.id(),
            "optimal-bounded-corner-pdb"
        );
        assert_eq!(
            SolverStrategy::OptimalBoundedCornerPdb.label(),
            "Optimal bounded corner PDB"
        );
        assert_eq!(
            SolverStrategy::OptimalBoundedCornerPdb.solver_mode(),
            "optimal_bounded_corner_pdb"
        );
        assert!(SolverStrategy::OptimalBoundedCornerPdb
            .status_text()
            .contains("corner-PDB IDA*"));
        assert_eq!(
            SolverStrategy::from_id("optimal-bounded-corner-pdb"),
            Some(SolverStrategy::OptimalBoundedCornerPdb)
        );
        assert_eq!(
            SolverStrategy::OptimalBoundedPdb16.id(),
            "optimal-bounded-pdb16"
        );
        assert_eq!(
            SolverStrategy::OptimalBoundedPdb16.label(),
            "Optimal bounded PDB16"
        );
        assert_eq!(
            SolverStrategy::OptimalBoundedPdb16.solver_mode(),
            "optimal_bounded_pdb16"
        );
        assert!(SolverStrategy::OptimalBoundedPdb16
            .status_text()
            .contains("6-edge PDB IDA*"));
        assert_eq!(
            SolverStrategy::from_id("optimal-bounded-pdb16"),
            Some(SolverStrategy::OptimalBoundedPdb16)
        );
        assert_eq!(
            SolverStrategy::ShortSolutionPortfolio.id(),
            "short-solution-portfolio"
        );
        assert_eq!(
            SolverStrategy::ShortSolutionPortfolio.label(),
            "Short solution portfolio"
        );
        assert_eq!(
            SolverStrategy::ShortSolutionPortfolio.solver_mode(),
            "short_solution_portfolio"
        );
        assert!(SolverStrategy::ShortSolutionPortfolio
            .status_text()
            .contains("Portfolio path"));
        assert_eq!(
            SolverStrategy::from_id("short-solution-portfolio"),
            Some(SolverStrategy::ShortSolutionPortfolio)
        );
        assert_eq!(SolverStrategy::from_id("unknown"), None);

        let metadata = SolverStrategy::GeneratedTwoPhase.metadata();
        assert_eq!(metadata.id, "generated-two-phase");
        assert_eq!(metadata.label, "Generated two-phase solver");
        assert_eq!(metadata.solver_mode, "generated_two_phase");
        assert_eq!(
            metadata.status_text,
            SolverStrategy::GeneratedTwoPhase.status_text()
        );
    }

    #[test]
    fn solver_strategy_supported_message_lists_all_strategy_ids() {
        assert_eq!(
            SolverStrategy::supported_strategy_ids(),
            "bounded-ida-star, generated-two-phase, generated-two-phase-quality, generated-two-phase-multiprobe, optimal-bounded-corner-pdb, optimal-bounded-pdb16, short-solution-portfolio"
        );

        let message = SolverStrategy::unsupported_strategy_message("made-up");
        assert!(message.contains("made-up"));
        assert!(message.contains("bounded-ida-star"));
        assert!(message.contains("generated-two-phase"));
        assert!(message.contains("generated-two-phase-quality"));
        assert!(message.contains("generated-two-phase-multiprobe"));
        assert!(message.contains("optimal-bounded-corner-pdb"));
        assert!(message.contains("optimal-bounded-pdb16"));
        assert!(message.contains("short-solution-portfolio"));

        assert!(SolverStrategy::unsupported_strategy_message("").contains("<empty>"));
    }

    #[test]
    fn solve_result_reports_moves_length_and_explored_nodes() {
        let moves = vec![Move::R, Move::UPrime];
        let result = SolveResult::with_metrics(moves, SolveMetrics::new(42));

        assert_eq!(result.moves(), &[Move::R, Move::UPrime]);
        assert_eq!(result.length(), 2);
        assert_eq!(result.len(), 2);
        assert_eq!(result.explored_nodes(), 42);
        assert_eq!(result.metrics().explored_nodes, 42);
    }

    #[test]
    fn empty_solve_result_reports_zero_length() {
        let result = SolveResult::new(Vec::new());

        assert_eq!(result.length(), 0);
        assert_eq!(result.len(), 0);
        assert!(result.is_empty());
        assert_eq!(result.explored_nodes(), 0);
    }

    #[test]
    fn solve_error_distinguishes_invalid_input_from_not_found() {
        let invalid = SolveError::InvalidInput {
            error: SolveInputError::CubieValidation {
                error: CubeValidationError::InvalidCornerOrientationSum { sum: 1 },
            },
        };
        let not_found = SolveError::NotFoundWithinLimits {
            config: SolverConfig::with_limits(1, Some(10)),
            explored_nodes: 10,
        };

        assert_ne!(invalid, not_found);
        assert!(matches!(invalid, SolveError::InvalidInput { .. }));
        assert!(matches!(not_found, SolveError::NotFoundWithinLimits { .. }));
    }

    #[test]
    fn root_exports_construct_solver_types() {
        let config = crate::SolverConfig::with_limits(3, Some(100));
        let selected_config = crate::SolverConfig::with_strategy(
            3,
            Some(100),
            crate::SolverStrategy::GeneratedTwoPhase,
        );
        let metrics = crate::SolveMetrics::new(2);
        let result = crate::SolveResult::with_metrics(vec![crate::Move::R], metrics);
        let not_found = crate::SolveError::NotFoundWithinLimits {
            config,
            explored_nodes: result.explored_nodes(),
        };
        let invalid = crate::SolveError::InvalidInput {
            error: crate::SolveInputError::CubieValidation {
                error: crate::CubeValidationError::InvalidCornerOrientationSum { sum: 1 },
            },
        };
        let playback: crate::FaceletPlaybackResult =
            crate::playback_facelet_solution(SOLVED_FACELET_STRING, "")
                .expect("root playback export should replay solved facelets");
        crate::validate_facelet_string(SOLVED_FACELET_STRING)
            .expect("root validation export should validate solved facelets");
        let playback_error = crate::FaceletPlaybackError::Notation {
            error: crate::NotationError::new("Q"),
        };

        assert_eq!(result.moves(), &[crate::Move::R]);
        assert_eq!(result.length(), 1);
        assert_eq!(
            selected_config.strategy,
            crate::SolverStrategy::GeneratedTwoPhase
        );
        assert!(playback.final_is_solved());
        assert!(matches!(
            not_found,
            crate::SolveError::NotFoundWithinLimits { .. }
        ));
        assert!(matches!(invalid, crate::SolveError::InvalidInput { .. }));
        assert!(matches!(
            playback_error,
            crate::FaceletPlaybackError::Notation { .. }
        ));
    }

    #[test]
    fn solved_cubie_state_returns_empty_solution() {
        let result = solve_cubie_state(CubieState::solved(), SolverConfig::new(0))
            .expect("solved cubie state should solve");

        assert!(result.is_empty());
        assert_eq!(result.length(), 0);
        assert_eq!(result.explored_nodes(), 1);
    }

    #[test]
    fn shallow_cubie_scramble_returns_valid_solution() {
        let state = scrambled_state(&[Move::R, Move::U]);
        let result = solve_cubie_state(state.clone(), SolverConfig::new(2))
            .expect("shallow cubie state should solve");

        assert_solution_solves_state(state, result.moves());
        assert_eq!(result.length(), result.moves().len());
        assert!(result.explored_nodes() > 0);
    }

    #[test]
    fn solved_facelet_string_returns_empty_solution() {
        let result = solve_facelet_string(SOLVED_FACELET_STRING, SolverConfig::new(0))
            .expect("solved facelet state should solve");

        assert!(result.is_empty());
        assert_eq!(result.length(), 0);
        assert_eq!(result.explored_nodes(), 1);
    }

    #[test]
    fn shallow_facelet_string_returns_verified_solution() {
        let cube = scrambled(&[Move::R, Move::U]);
        let input = FaceletString::from_cube(&cube).to_string();
        let result = solve_facelet_string(&input, SolverConfig::new(2))
            .expect("shallow facelet state should solve");

        assert_solution_solves_cube(cube, result.moves());
        assert_eq!(result.length(), result.moves().len());
        assert!(result.explored_nodes() > 0);
    }

    #[test]
    fn solved_and_shallow_facelet_strings_validate_successfully() {
        validate_facelet_string(SOLVED_FACELET_STRING)
            .expect("solved facelet state should validate");

        let input = facelet_string_for(&[Move::R, Move::U]);
        validate_facelet_string(&input).expect("shallow moved facelet state should validate");
    }

    #[test]
    fn facelet_validation_returns_parse_conversion_and_cubie_errors() {
        assert_eq!(
            validate_facelet_string("U"),
            Err(SolveInputError::FaceletParse {
                error: FaceletParseError::InvalidLength {
                    expected: FACELET_COUNT,
                    actual: 1,
                },
            })
        );

        let center_input = facelet_input_with_swapped_stickers(
            CENTER_FACELET_POSITIONS[0].position,
            CENTER_FACELET_POSITIONS[1].position,
        );
        assert_eq!(
            validate_facelet_string(&center_input),
            Err(SolveInputError::FaceletConversion {
                error: FaceletConversionError::InvalidCenterSticker {
                    position: CENTER_FACELET_POSITIONS[0].position,
                    expected: Facelet::U,
                    actual: Facelet::R,
                },
            })
        );

        let impossible_input = facelet_input_with_flipped_edge(Edge::Ur);
        assert_eq!(
            validate_facelet_string(&impossible_input),
            Err(SolveInputError::FaceletConversion {
                error: FaceletConversionError::CubieValidation {
                    error: CubeValidationError::InvalidEdgeOrientationSum { sum: 1 },
                },
            })
        );
    }

    #[test]
    fn facelet_playback_returns_solved_for_solved_input_without_moves() {
        let result = playback_facelet_solution(SOLVED_FACELET_STRING, "")
            .expect("solved facelets with no moves should replay");

        assert_eq!(result.states().len(), 1);
        assert_eq!(result.states()[0], SOLVED_FACELET_STRING);
        assert!(result.final_is_solved());
    }

    #[test]
    fn facelet_playback_replays_solution_from_shallow_scramble() {
        let start = facelet_string_for(&[Move::R, Move::U]);
        let mut after_first_solution_move = scrambled(&[Move::R, Move::U]);
        after_first_solution_move.apply_move(Move::UPrime);
        let expected_middle = FaceletString::from_cube(&after_first_solution_move).to_string();

        let result = playback_facelet_solution(&start, "U' R'")
            .expect("valid solution should replay from facelets");

        assert_eq!(result.states().len(), 3);
        assert_eq!(result.states()[0], start);
        assert_eq!(result.states()[1], expected_middle);
        assert_eq!(result.states()[2], SOLVED_FACELET_STRING);
        assert!(result.final_is_solved());
    }

    #[test]
    fn facelet_playback_returns_structured_parse_errors() {
        let error = playback_facelet_solution("U", "")
            .expect_err("invalid starting facelet syntax should not replay");

        assert_eq!(
            error,
            FaceletPlaybackError::FaceletParse {
                error: FaceletParseError::InvalidLength {
                    expected: FACELET_COUNT,
                    actual: 1,
                },
            }
        );
    }

    #[test]
    fn facelet_playback_returns_structured_conversion_errors() {
        let input = facelet_input_with_flipped_edge(Edge::Ur);
        let error = playback_facelet_solution(&input, "")
            .expect_err("impossible starting facelets should not replay");

        assert_eq!(
            error,
            FaceletPlaybackError::FaceletConversion {
                error: FaceletConversionError::CubieValidation {
                    error: CubeValidationError::InvalidEdgeOrientationSum { sum: 1 },
                },
            }
        );
    }

    #[test]
    fn facelet_playback_returns_structured_notation_errors() {
        let error = playback_facelet_solution(SOLVED_FACELET_STRING, "R Q")
            .expect_err("invalid move notation should not replay");

        assert_eq!(
            error,
            FaceletPlaybackError::Notation {
                error: crate::NotationError::new("Q"),
            }
        );
    }

    #[test]
    fn facelet_playback_reports_non_solving_final_state() {
        let result = playback_facelet_solution(SOLVED_FACELET_STRING, "R")
            .expect("valid notation should replay even when it does not solve");

        assert_eq!(result.states().len(), 2);
        assert_eq!(result.states()[0], SOLVED_FACELET_STRING);
        assert_ne!(result.states()[1], SOLVED_FACELET_STRING);
        assert!(!result.final_is_solved());
    }

    #[test]
    fn facelet_parse_failures_return_structured_input_errors() {
        let cases = [
            (
                "U",
                FaceletParseError::InvalidLength {
                    expected: FACELET_COUNT,
                    actual: 1,
                },
            ),
            (
                "UUUUUUUUURXRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB",
                FaceletParseError::InvalidSymbol {
                    position: 10,
                    symbol: 'X',
                },
            ),
            (
                "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBU",
                FaceletParseError::InvalidFaceCount {
                    facelet: Facelet::U,
                    expected: 9,
                    actual: 10,
                },
            ),
        ];

        for (input, expected) in cases {
            let error = solve_facelet_string(input, SolverConfig::new(0))
                .expect_err("invalid facelet syntax should not solve");

            assert_eq!(
                error,
                SolveError::InvalidInput {
                    error: SolveInputError::FaceletParse { error: expected },
                }
            );
        }
    }

    #[test]
    fn facelet_conversion_failures_return_structured_input_errors() {
        let center_input = facelet_input_with_swapped_stickers(
            CENTER_FACELET_POSITIONS[0].position,
            CENTER_FACELET_POSITIONS[1].position,
        );
        let center_error = solve_facelet_string(&center_input, SolverConfig::new(0))
            .expect_err("invalid center stickers should not solve");
        assert_eq!(
            center_error,
            SolveError::InvalidInput {
                error: SolveInputError::FaceletConversion {
                    error: FaceletConversionError::InvalidCenterSticker {
                        position: CENTER_FACELET_POSITIONS[0].position,
                        expected: Facelet::U,
                        actual: Facelet::R,
                    },
                },
            }
        );

        let unknown_edge_input = facelet_input_with_sticker_changes(&[(10, 'D'), (32, 'R')]);
        let unknown_edge_error = solve_facelet_string(&unknown_edge_input, SolverConfig::new(0))
            .expect_err("unknown edge stickers should not solve");
        assert_eq!(
            unknown_edge_error,
            SolveError::InvalidInput {
                error: SolveInputError::FaceletConversion {
                    error: FaceletConversionError::UnknownEdgeStickers {
                        position: Edge::Ur,
                        stickers: [Facelet::U, Facelet::D],
                    },
                },
            }
        );

        let duplicate_corner_input =
            facelet_input_with_sticker_changes(&[(18, 'R'), (38, 'F'), (10, 'L')]);
        let duplicate_corner_error =
            solve_facelet_string(&duplicate_corner_input, SolverConfig::new(0))
                .expect_err("duplicate corner stickers should not solve");
        assert_eq!(
            duplicate_corner_error,
            SolveError::InvalidInput {
                error: SolveInputError::FaceletConversion {
                    error: FaceletConversionError::DuplicateCornerStickers {
                        corner: Corner::Urf,
                        first_position: Corner::Urf,
                        duplicate_position: Corner::Ufl,
                    },
                },
            }
        );
    }

    #[test]
    fn impossible_facelet_state_returns_cubie_validation_conversion_error() {
        let input = facelet_input_with_flipped_edge(Edge::Ur);
        let error = solve_facelet_string(&input, SolverConfig::new(1))
            .expect_err("single flipped edge should fail cubie validation");

        assert_eq!(
            error,
            SolveError::InvalidInput {
                error: SolveInputError::FaceletConversion {
                    error: FaceletConversionError::CubieValidation {
                        error: CubeValidationError::InvalidEdgeOrientationSum { sum: 1 },
                    },
                },
            }
        );
    }

    #[test]
    fn facelet_solver_reports_depth_limit_as_search_failure() {
        let input = facelet_string_for(&[Move::R, Move::U]);
        let config = SolverConfig::new(1);

        let error = solve_facelet_string(&input, config.clone())
            .expect_err("depth-one search should not solve a two-move facelet scramble");

        match error {
            SolveError::NotFoundWithinLimits {
                config: actual_config,
                explored_nodes,
            } => {
                assert_eq!(actual_config, config);
                assert!(explored_nodes > 0);
            }
            SolveError::InvalidInput { .. }
            | SolveError::GeneratedTablesUnavailable { .. }
            | SolveError::GeneratedTablesCorrupt { .. } => {
                panic!("depth limit should not be invalid input or table unavailable")
            }
        }
    }

    #[test]
    fn facelet_solver_reports_node_budget_as_search_failure() {
        let input = facelet_string_for(&[Move::R]);
        let config = SolverConfig::with_limits(1, Some(0));

        let error = solve_facelet_string(&input, config.clone())
            .expect_err("zero-node budget should stop bounded facelet search");

        assert_eq!(
            error,
            SolveError::NotFoundWithinLimits {
                config: config.clone(),
                explored_nodes: 0,
            }
        );

        let config = SolverConfig::with_limits(1, Some(1));
        let error = solve_facelet_string(&input, config.clone())
            .expect_err("one-node budget should stop bounded facelet search after root");

        assert_eq!(
            error,
            SolveError::NotFoundWithinLimits {
                config: config.clone(),
                explored_nodes: 1,
            }
        );
    }

    #[test]
    fn invalid_cubie_state_returns_validation_error() {
        let mut state = CubieState::solved();
        state.edge_orientation[0] = 1;

        let error = solve_cubie_state(state, SolverConfig::new(1))
            .expect_err("invalid cubie state should not solve");

        assert_eq!(
            error,
            SolveError::InvalidInput {
                error: SolveInputError::CubieValidation {
                    error: CubeValidationError::InvalidEdgeOrientationSum { sum: 1 },
                },
            }
        );
    }

    #[test]
    fn insufficient_max_depth_reports_limit_failure() {
        let state = scrambled_state(&[Move::R, Move::U]);
        let config = SolverConfig::new(1);

        let error = solve_cubie_state(state, config.clone())
            .expect_err("depth-one search should not solve a two-move scramble");

        match error {
            SolveError::NotFoundWithinLimits {
                config: actual_config,
                explored_nodes,
            } => {
                assert_eq!(actual_config, config);
                assert!(explored_nodes > 0);
            }
            SolveError::InvalidInput { .. }
            | SolveError::GeneratedTablesUnavailable { .. }
            | SolveError::GeneratedTablesCorrupt { .. } => {
                panic!("depth limit should not be invalid input or table unavailable")
            }
        }
    }

    #[test]
    fn max_nodes_limit_is_reported_as_limit_failure() {
        let state = scrambled_state(&[Move::R]);
        let config = SolverConfig::with_limits(1, Some(0));

        let error = solve_cubie_state(state.clone(), config.clone())
            .expect_err("zero-node budget should stop bounded search");

        assert_eq!(
            error,
            SolveError::NotFoundWithinLimits {
                config: config.clone(),
                explored_nodes: 0,
            }
        );

        let config = SolverConfig::with_limits(1, Some(1));
        let error = solve_cubie_state(state, config.clone())
            .expect_err("one-node budget should stop bounded search after root");

        assert_eq!(
            error,
            SolveError::NotFoundWithinLimits {
                config: config.clone(),
                explored_nodes: 1,
            }
        );
    }

    #[test]
    fn solve_cube_accepts_valid_cube_inputs() {
        let cube = scrambled(&[Move::R]);
        let result = solve_cube(&cube, SolverConfig::new(1)).expect("cube should solve");

        assert_solution_solves_cube(cube, result.moves());
    }

    #[test]
    fn replay_failure_is_not_returned_as_success() {
        let config = SolverConfig::new(1);
        let bad_outcome = SearchOutcome::Found(SearchSolution::with_metrics(vec![Move::R], 7));

        let error = solve_search_outcome(&Cube::solved(), config.clone(), bad_outcome)
            .expect_err("non-solving moves must not be returned");

        assert_eq!(
            error,
            SolveError::NotFoundWithinLimits {
                config,
                explored_nodes: 7,
            }
        );
    }

    #[test]
    fn root_exports_solve_cubie_state() {
        let state = scrambled_state(&[Move::R]);
        let result = crate::solve_cubie_state(state.clone(), crate::SolverConfig::new(1))
            .expect("root cubie solver export should solve");

        assert_solution_solves_state(state, result.moves());
        assert_eq!(result.length(), 1);
        assert_eq!(result.metrics().explored_nodes, result.explored_nodes());
    }

    #[test]
    fn root_exports_solve_facelet_string() {
        let input = facelet_string_for(&[Move::R]);
        let state = FaceletString::parse(&input)
            .expect("test facelets should parse")
            .to_cubie_state()
            .expect("test facelets should convert");
        let result = crate::solve_facelet_string(&input, crate::SolverConfig::new(1))
            .expect("root facelet solver export should solve");

        assert_solution_solves_state(state, result.moves());
        assert_eq!(result.length(), 1);
    }

    fn scrambled(moves: &[Move]) -> Cube {
        let mut cube = Cube::solved();
        cube.apply_moves(moves);
        cube
    }

    fn scrambled_state(moves: &[Move]) -> CubieState {
        scrambled(moves).state().clone()
    }

    fn facelet_string_for(moves: &[Move]) -> String {
        FaceletString::from_cube(&scrambled(moves)).to_string()
    }

    fn facelet_input_with_swapped_stickers(left: usize, right: usize) -> String {
        let mut facelets = solved_facelet_symbols();
        facelets.swap(left, right);

        collect_facelets(facelets)
    }

    fn facelet_input_with_sticker_changes(changes: &[(usize, char)]) -> String {
        let mut facelets = solved_facelet_symbols();

        for (position, symbol) in changes {
            facelets[*position] = *symbol;
        }

        collect_facelets(facelets)
    }

    fn facelet_input_with_flipped_edge(edge: Edge) -> String {
        let mut facelets = solved_facelet_symbols();
        let mapping = EDGE_FACELET_MAPPINGS[edge.index()];

        facelets.swap(mapping.stickers[0].position, mapping.stickers[1].position);

        collect_facelets(facelets)
    }

    fn solved_facelet_symbols() -> Vec<char> {
        SOLVED_FACELET_STRING.chars().collect()
    }

    fn collect_facelets(facelets: Vec<char>) -> String {
        facelets.into_iter().collect()
    }

    fn assert_solution_solves_state(state: CubieState, solution: &[Move]) {
        let cube = Cube::try_from_state(state).expect("test state should be valid");

        assert_solution_solves_cube(cube, solution);
    }

    fn assert_solution_solves_cube(mut cube: Cube, solution: &[Move]) {
        cube.apply_moves(solution);

        assert!(cube.is_solved());
    }
}
