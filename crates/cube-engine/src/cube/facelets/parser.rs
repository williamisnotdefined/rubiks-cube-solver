use std::fmt;
use std::str::FromStr;

use super::{
    Facelet, FaceletParseError, FaceletString, FACELETS_PER_FACE, FACELET_COUNT,
    FACELET_SYMBOL_COUNT,
};

impl FaceletString {
    pub fn parse(input: &str) -> Result<Self, FaceletParseError> {
        input.parse()
    }

    pub const fn as_facelets(&self) -> &[Facelet; FACELET_COUNT] {
        &self.facelets
    }
}

impl fmt::Display for FaceletString {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        for facelet in self.facelets {
            write!(formatter, "{}", facelet.symbol())?;
        }

        Ok(())
    }
}

impl FromStr for FaceletString {
    type Err = FaceletParseError;

    fn from_str(input: &str) -> Result<Self, Self::Err> {
        let actual = input.chars().count();
        if actual != FACELET_COUNT {
            return Err(FaceletParseError::InvalidLength {
                expected: FACELET_COUNT,
                actual,
            });
        }

        let mut facelets = [Facelet::U; FACELET_COUNT];
        let mut counts = [0_usize; FACELET_SYMBOL_COUNT];

        for (position, symbol) in input.chars().enumerate() {
            let facelet = Facelet::from_symbol(symbol)
                .ok_or(FaceletParseError::InvalidSymbol { position, symbol })?;

            facelets[position] = facelet;
            counts[facelet.index()] += 1;
        }

        for facelet in Facelet::ALL {
            let actual = counts[facelet.index()];
            if actual != FACELETS_PER_FACE {
                return Err(FaceletParseError::InvalidFaceCount {
                    facelet,
                    expected: FACELETS_PER_FACE,
                    actual,
                });
            }
        }

        Ok(Self { facelets })
    }
}
