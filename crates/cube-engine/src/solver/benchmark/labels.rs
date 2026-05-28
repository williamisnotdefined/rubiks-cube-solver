use crate::cube::{Algorithm, Move};

pub(super) fn format_not_found_message(
    max_depth: usize,
    max_nodes: Option<usize>,
    explored_nodes: usize,
) -> String {
    match max_nodes {
        Some(max_nodes) => format!(
            "no solution found within limits: max_depth={max_depth}, max_nodes={max_nodes}, explored_nodes={explored_nodes}"
        ),
        None => format!(
            "no solution found within limits: max_depth={max_depth}, max_nodes=unlimited, explored_nodes={explored_nodes}"
        ),
    }
}

pub(super) fn moves_label(moves: &[Move]) -> String {
    if moves.is_empty() {
        return String::new();
    }

    Algorithm::new(moves.to_vec()).to_string()
}

pub(super) fn max_nodes_label(max_nodes: Option<usize>) -> String {
    max_nodes.map_or_else(|| "unlimited".to_owned(), |value| value.to_string())
}

pub(super) fn optional_usize_label(value: Option<usize>) -> String {
    value.map_or_else(String::new, |value| value.to_string())
}

pub(super) fn optional_bool_label(value: Option<bool>) -> &'static str {
    match value {
        Some(true) => "true",
        Some(false) => "false",
        None => "",
    }
}
