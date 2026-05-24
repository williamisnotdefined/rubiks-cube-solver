#!/usr/bin/env node

import { readExecution, summarizeExecution, validateExecution } from "./lib.mjs";

const execution = await readExecution();
const errors = validateExecution(execution);

if (errors.length > 0) {
  console.error(`Roadmap execution file is invalid:\n${errors.map((error) => `- ${error}`).join("\n")}`);
  process.exit(1);
}

const summary = summarizeExecution(execution);
console.log(
  `Roadmap execution file is valid: ${execution.steps.length} steps (${Object.entries(summary)
    .map(([status, count]) => `${status}: ${count}`)
    .join(", ")}).`,
);
