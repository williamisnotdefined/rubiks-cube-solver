pub(super) fn binomial(n: usize, k: usize) -> usize {
    if k > n {
        return 0;
    }

    let k = k.min(n - k);
    let mut result = 1;

    for divisor in 1..=k {
        result = result * (n - k + divisor) / divisor;
    }

    result
}

pub(super) fn factorial(n: usize) -> usize {
    let mut result = 1;

    for factor in 2..=n {
        result *= factor;
    }

    result
}
