#!/usr/bin/env node

import { findNextRunnableStep, formatStep, parseArgs, readExecution, validateExecution, validateGoalsFile } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const execution = await readExecution();
const errors = [...(await validateGoalsFile()), ...validateExecution(execution)];

if (errors.length > 0) {
  console.error(`Roadmap execution file is invalid. Run npm run roadmap:check for details.`);
  process.exit(1);
}

const nextStep = findNextRunnableStep(execution);
if (!nextStep) {
  console.log("No runnable pending step found.");
  process.exit(0);
}

if (args.json) {
  console.log(JSON.stringify(nextStep, null, 2));
} else {
  console.log(formatStep(nextStep));
}
