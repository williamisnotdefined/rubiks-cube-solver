#[derive(Clone, Copy, Debug)]
pub(super) struct DatasetRng {
    state: u64,
}

impl DatasetRng {
    pub(super) const fn new(seed: u64) -> Self {
        Self {
            state: seed ^ 0xa076_1d64_78bd_642f,
        }
    }

    pub(super) fn next_u64(&mut self) -> u64 {
        self.state = self
            .state
            .wrapping_mul(6_364_136_223_846_793_005)
            .wrapping_add(1_442_695_040_888_963_407);

        self.state
    }

    pub(super) fn next_index(&mut self, upper_bound: usize) -> usize {
        debug_assert!(upper_bound > 0);

        (self.next_u64() % upper_bound as u64) as usize
    }
}
