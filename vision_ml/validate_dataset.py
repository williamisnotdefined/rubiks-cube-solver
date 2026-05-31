from __future__ import annotations

import argparse
from pathlib import Path

from .dataset_schema import load_dataset_file


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate a Rubik's cube vision dataset JSON file.")
    parser.add_argument("dataset", type=Path)
    args = parser.parse_args()

    dataset = load_dataset_file(args.dataset)
    print(f"validated {len(dataset.sessions)} vision scan sessions")


if __name__ == "__main__":
    main()
