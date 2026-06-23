# Security Policy

## Supported Versions

The active `main` branch is the only supported development line until formal releases are introduced.

## Reporting A Vulnerability

Use GitHub private vulnerability reporting when it is enabled for this repository. If it is not available, open a minimal public issue that avoids exploit details and ask the maintainer for a private coordination channel.

Do not post secrets, private images, camera captures, model files, exploit payloads, or sensitive environment details in public issues.

## Security Boundaries

- Rust is the authority for puzzle state, validation, solving, generated artifacts, and replay verification.
- A scanner prediction is not proof of a valid cube state.
- The web UI must not implement solver logic or bypass server-side limits.
- Generated pruning tables, ONNX models, private captures, logs, and `.env` files are local artifacts and must not be committed.

## Maintainer Response

Security reports should be triaged for impact, reproducibility, affected components, and whether a release or advisory is needed. Fixes should include regression tests or documented verification.
