# ADR 0006: API Versioning

Status: proposed

## Context

Current API endpoints are product-facing but not yet documented as a versioned compatibility contract.

## Decision

Introduce a staged `/api/v1` contract before making breaking changes, while retaining current endpoints during a documented compatibility window.

## Consequences

- OpenAPI generation and TypeScript client generation should come from the canonical contract.
- Typed error codes and examples should be stable within a version.
- Schema drift should fail CI once the contract exists.
