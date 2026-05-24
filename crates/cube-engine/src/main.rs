use cube_engine::cube::notation::parse_algorithm;

fn main() {
    let sample = parse_algorithm("R U R' U'").expect("sample notation should parse");

    println!(
        "cube-engine bootstrap: {} sample moves parsed",
        sample.len()
    );
}
