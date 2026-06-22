from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from scanner.contracts.scan_session_export import (
    ScanSessionExport,
    load_scan_session_export_file,
    validate_symbol,
    validate_facelet_string,
    validate_scan_session_export,
)


def label_scan_session_export_file(
    input_path: str | Path,
    output_path: str | Path,
    *,
    face_assignments: list[str] | None = None,
    facelets: str | None = None,
    from_confirmed: bool = False,
    notes: str | None = None,
    overwrite_label: bool = False,
    validated_by: str | None = None,
) -> Path:
    export = load_scan_session_export_file(input_path)
    if export.label is not None and not overwrite_label:
        raise ValueError("scan session already has a label; pass --overwrite-label to replace it")

    label = build_label(
        export,
        face_assignments=face_assignments or [],
        facelets=facelets,
        from_confirmed=from_confirmed,
        notes=notes,
        validated_by=validated_by,
    )

    data = export.model_dump(mode="json", exclude_none=True)
    data["label"] = label
    validate_scan_session_export(data)

    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    return output


def build_label(
    export: ScanSessionExport,
    *,
    face_assignments: list[str],
    facelets: str | None,
    from_confirmed: bool,
    notes: str | None,
    validated_by: str | None,
) -> dict[str, Any]:
    sources = sum(
        [
            bool(face_assignments),
            facelets is not None,
            from_confirmed,
        ]
    )
    if sources != 1:
        raise ValueError("provide exactly one label source: --face, --facelets, or --from-confirmed")
    if from_confirmed and not validated_by:
        raise ValueError("--from-confirmed requires --validated-by")

    label: dict[str, Any] = {}
    if facelets is not None:
        validate_facelet_string(facelets, expected_length=54)
        label["facelets"] = facelets
    elif from_confirmed:
        label["faces"] = labels_from_confirmed_faces(export)
    else:
        label["faces"] = parse_face_assignments(face_assignments)

    if notes:
        label["notes"] = notes
    if validated_by:
        label["validatedBy"] = validated_by
    return label


def parse_face_assignments(assignments: list[str]) -> dict[str, str]:
    labels: dict[str, str] = {}
    for assignment in assignments:
        if "=" not in assignment:
            raise ValueError("face labels must use FACE=STICKERS, for example F=FFFFFFFFF")
        symbol, stickers = assignment.split("=", 1)
        symbol = validate_symbol(symbol.strip())
        stickers = stickers.strip()
        validate_facelet_string(stickers, expected_length=9)
        if symbol in labels:
            raise ValueError(f"duplicate label for face {symbol}")
        labels[symbol] = stickers
    return labels


def labels_from_confirmed_faces(export: ScanSessionExport) -> dict[str, str]:
    labels: dict[str, str] = {}
    for face in export.faces:
        if not face.confirmed:
            raise ValueError(f"face {face.symbol} is not confirmed")
        symbols = [sticker.symbol for sticker in sorted(face.stickers, key=lambda sticker: sticker.index)]
        if any(symbol is None for symbol in symbols):
            raise ValueError(f"face {face.symbol} has incomplete sticker symbols")
        labels[face.symbol] = "".join(symbols)  # type: ignore[arg-type]
    return labels


def run(args: argparse.Namespace) -> int:
    output = Path(args.input) if args.in_place else args.output
    if output is None:
        print("--output is required unless --in-place is used", file=sys.stderr)
        return 2
    if Path(output).resolve() == Path(args.input).resolve() and not args.in_place:
        print("refusing to overwrite input without --in-place", file=sys.stderr)
        return 2

    try:
        label_scan_session_export_file(
            args.input,
            output,
            face_assignments=args.face,
            facelets=args.facelets,
            from_confirmed=args.from_confirmed,
            notes=args.notes,
            overwrite_label=args.overwrite_label,
            validated_by=args.validated_by,
        )
    except ValueError as error:
        print(str(error), file=sys.stderr)
        return 2
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Add reviewed labels to exported Rubik's cube scan sessions.")
    parser.add_argument("--input", required=True, type=Path, help="Scan session export JSON file.")
    parser.add_argument("--output", type=Path, help="Labeled export output path.")
    parser.add_argument("--in-place", action="store_true", help="Overwrite the input file with the labeled export.")
    parser.add_argument("--face", action="append", default=[], help="Reviewed face label as FACE=STICKERS.")
    parser.add_argument("--facelets", help="Reviewed canonical U,R,F,D,L,B facelet string.")
    parser.add_argument("--from-confirmed", action="store_true", help="Use the currently confirmed stickers as the label.")
    parser.add_argument("--notes", help="Optional label notes.")
    parser.add_argument("--validated-by", help="Reviewer identifier for the label.")
    parser.add_argument("--overwrite-label", action="store_true", help="Replace an existing label.")
    raise SystemExit(run(parser.parse_args()))


if __name__ == "__main__":
    main()
