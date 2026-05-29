#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub(super) enum MoveOrderingProfile {
    #[default]
    Default,
    Reverse,
    HalfTurnsFirst,
    AxisZFirst,
    AxisXFirst,
}

pub(super) const MULTIPROBE_ORDERING_PROFILES: [MoveOrderingProfile; 5] = [
    MoveOrderingProfile::Default,
    MoveOrderingProfile::Reverse,
    MoveOrderingProfile::HalfTurnsFirst,
    MoveOrderingProfile::AxisZFirst,
    MoveOrderingProfile::AxisXFirst,
];
