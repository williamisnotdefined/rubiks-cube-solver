use crate::cube::CubieState;

pub(super) fn encode_cubie_state(state: &CubieState) -> Vec<f64> {
    let mut features = Vec::with_capacity(40);
    features.extend(
        state
            .corner_permutation
            .iter()
            .map(|corner| corner.index() as f64 / 7.0),
    );
    features.extend(
        state
            .corner_orientation
            .iter()
            .map(|orientation| f64::from(*orientation) / 2.0),
    );
    features.extend(
        state
            .edge_permutation
            .iter()
            .map(|edge| edge.index() as f64 / 11.0),
    );
    features.extend(
        state
            .edge_orientation
            .iter()
            .map(|orientation| f64::from(*orientation)),
    );
    debug_assert_eq!(features.len(), 40);

    features
}
