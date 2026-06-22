FROM node:22-bookworm-slim AS web-build

WORKDIR /src
COPY package.json package-lock.json ./
COPY packages/rubiks-cube/package.json packages/rubiks-cube/package.json
COPY web/package.json web/package.json
RUN npm ci

COPY packages/rubiks-cube packages/rubiks-cube
COPY web web
RUN npm run build -w @rubiks-cube-solver/web

FROM rust:1-bookworm AS rust-build

WORKDIR /src
COPY Cargo.toml Cargo.lock rust-toolchain.toml ./
COPY crates crates
RUN cargo build -p rubiks-cube-solver-api --release
RUN cargo run --release --quiet -p cube-engine --bin generate_pruning_tables -- \
  --output /artifacts/pruning-tables \
  --phase1-max-depth 8 \
  --phase2-max-depth 10

FROM debian:bookworm-slim AS runtime

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=rust-build /src/target/release/rubiks-cube-solver-api /usr/local/bin/rubiks-cube-solver-api
COPY --from=rust-build /artifacts/pruning-tables /app/pruning-tables
COPY --from=web-build /src/web/dist /app/web

ENV RUBIKS_API_ADDR=0.0.0.0:8787 \
  RUBIKS_WEB_DIST_DIR=/app/web \
  RUBIKS_PRUNING_TABLE_DIR=/app/pruning-tables \
  RUBIKS_VISION_URL=http://vision:8790

EXPOSE 8787
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=5 \
  CMD curl -fsS http://127.0.0.1:8787/health >/dev/null || exit 1

CMD ["rubiks-cube-solver-api"]
