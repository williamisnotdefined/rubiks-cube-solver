use cube_engine::{
    Algorithm, Cube, CubeValidationError, FaceletConversionError, FaceletString,
    CORNER_FACELET_MAPPINGS, EDGE_FACELET_MAPPINGS,
};

#[test]
fn known_multi_move_facelet_states_round_trip_to_matching_cubie_states() {
    let fixtures = ["R U R'", "F R U R' U' F'", "R U R' U' F2 D L' B U2"];

    for notation in fixtures {
        let algorithm = Algorithm::parse(notation).expect("fixture algorithm should parse");
        let mut cube = Cube::solved();
        algorithm.apply_to(&mut cube);
        assert!(!cube.is_solved(), "{notation}");

        let rendered = FaceletString::from_cube(&cube).to_string();
        let parsed = FaceletString::parse(&rendered).expect("rendered facelets should parse");
        let recovered = parsed
            .to_cubie_state()
            .expect("rendered facelets should convert to cubies");

        assert_eq!(&recovered, cube.state(), "{notation}");
    }
}

#[test]
fn swapped_piece_facelets_are_rejected_through_cubie_validation() {
    let parsed = parse_with_swapped_corner_pieces(0, 1);

    assert_eq!(
        parsed.to_cubie_state(),
        Err(FaceletConversionError::CubieValidation {
            error: CubeValidationError::InvalidPermutationParity {
                corner_parity_odd: true,
                edge_parity_odd: false,
            },
        })
    );
}

#[test]
fn flipped_edge_facelets_are_rejected_through_cubie_validation() {
    let parsed = parse_with_flipped_edge(0);

    assert_eq!(
        parsed.to_cubie_state(),
        Err(FaceletConversionError::CubieValidation {
            error: CubeValidationError::InvalidEdgeOrientationSum { sum: 1 },
        })
    );
}

fn parse_with_swapped_corner_pieces(left: usize, right: usize) -> FaceletString {
    let mut facelets = solved_facelet_symbols();
    let left_mapping = CORNER_FACELET_MAPPINGS[left];
    let right_mapping = CORNER_FACELET_MAPPINGS[right];

    for sticker_index in 0..left_mapping.stickers.len() {
        facelets.swap(
            left_mapping.stickers[sticker_index].position,
            right_mapping.stickers[sticker_index].position,
        );
    }

    parse_symbols(facelets)
}

fn parse_with_flipped_edge(edge: usize) -> FaceletString {
    let mut facelets = solved_facelet_symbols();
    let mapping = EDGE_FACELET_MAPPINGS[edge];

    facelets.swap(mapping.stickers[0].position, mapping.stickers[1].position);

    parse_symbols(facelets)
}

fn solved_facelet_symbols() -> Vec<char> {
    FaceletString::from_cube(&Cube::solved())
        .to_string()
        .chars()
        .collect()
}

fn parse_symbols(facelets: Vec<char>) -> FaceletString {
    let input = facelets.into_iter().collect::<String>();

    FaceletString::parse(&input).expect("fixture facelets should parse")
}
