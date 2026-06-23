#!/usr/bin/env node

const sections = [
  [
    'Daily commands',
    [
      ['npm run dev', 'Build and start Docker dev on 5173/8788/8791'],
      ['npm run dev:restart', 'Rebuild and recreate Docker dev'],
      ['npm run dev:stop', 'Stop Docker dev'],
      ['npm run dev:status', 'Show Docker dev containers'],
      ['npm run dev:logs', 'Follow Docker dev logs'],
      ['npm run live:deploy', 'Pull main, rebuild production Docker, and health-check'],
      ['npm run live:start', 'Run live:deploy, then start the Cloudflare tunnel'],
      ['npm run live:status', 'Show production Docker containers'],
      ['npm run live:logs', 'Follow production Docker logs'],
      ['npm run live:stop', 'Stop production Docker'],
    ],
  ],
  [
    'Validation',
    [
      ['npm run bootstrap:check', 'Fast repository bootstrap validation'],
      ['npm run product:gate', 'Full release-level validation gate'],
      ['npm run test:e2e:smoke', 'Product, responsive, and timer E2E smoke tests'],
    ],
  ],
  [
    'Advanced',
    [
      ['npm run dev:local:prepare', 'Prepare local non-Docker fallback runtime'],
      ['npm run dev:local', 'Start local non-Docker fallback runtime'],
      ['npm run docker:train', 'Run scanner trainer container on CPU'],
      ['npm run docker:train-gpu', 'Run scanner trainer container with NVIDIA GPU'],
    ],
  ],
]

for (const [title, rows] of sections) {
  console.log(`\n${title}`)
  for (const [command, description] of rows) {
    console.log(`  ${command.padEnd(32)} ${description}`)
  }
}
