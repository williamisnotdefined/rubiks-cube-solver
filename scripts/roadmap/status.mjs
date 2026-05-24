#!/usr/bin/env node

import { findNextRunnableStep, formatStep, readExecution, summarizeExecution, validateExecution } from "./lib.mjs";

const execution = await readExecution();
const errors = validateExecution(execution);

if (errors.length > 0) {
  console.error(`Roadmap execution file is invalid. Run npm run roadmap:check for details.`);
  process.exit(1);
}

const summary = summarizeExecution(execution);
console.log("Roadmap status:");
for (const [status, count] of Object.entries(summary)) {
  console.log(`- ${status}: ${count}`);
}

const nextStep = findNextRunnableStep(execution);
if (nextStep) {
  console.log(`\nNext runnable step:\n${formatStep(nextStep)}`);
} else {
  console.log("\nNo runnable pending step found.");
}
